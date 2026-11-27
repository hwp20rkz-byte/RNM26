"""Граф четырёх агентов SinoFlow на LangGraph.

    START ─▶ route ─▶ analyst ─▶ hunter ─▶ negotiator ─┬─▶ human_gate ─▶ send_reply ─▶ negotiator
                                                        ├─▶ costing ─▶ END           (сделка достигнута)
                                                        └─▶ END                      (ждём ответ завода)

Ключевые решения:
* Граф — возобновляемый конечный автомат. Новый вход (вебхук с ответом завода) запускает тот же
  thread_id, а `route` по состоянию решает, с какого агента продолжать.
* Обязывающие сообщения заводу проходят через `human_gate` с `interrupt()`. Это отдельный узел:
  при возобновлении LangGraph перезапускает узел с начала, и LLM-вызовы до interrupt повторились бы.
* Деньги считает детерминированный код (currency.py). LLM только извлекает, переводит и пишет текст.
* Без ANTHROPIC_API_KEY (или с MOCK_LLM=1) агенты отвечают фикстурами демо-кейса — граф можно
  прогнать в CI и локально без затрат.
"""
from __future__ import annotations

import operator
import os
from typing import Annotated, Any, Literal, TypedDict, TypeVar

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from pydantic import BaseModel

from . import fixtures
from .currency import landed_cost
from .models import NegotiationTurn, ProposalText, ShortList, SpecAnalysis
from .sources import default_sources

# ───────────────────────────── LLM-слой ─────────────────────────────

MODEL = os.getenv("SINOFLOW_MODEL", "claude-opus-5-5")
# Глубина рассуждений настраивается effort, а не сменой модели: Hunter массово классифицирует — low.
EFFORT = {"analyst": "high", "hunter": "low", "negotiator": "high", "costing": "medium"}

T = TypeVar("T", bound=BaseModel)


class RefusalError(RuntimeError):
    pass


class Llm:
    """Обёртка над `client.messages.parse` со структурированным выходом Pydantic."""

    def __init__(self) -> None:
        self.mock = os.getenv("MOCK_LLM") == "1" or not os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        if not self.mock:
            import anthropic

            self.client = anthropic.Anthropic()

    def parse(self, agent: str, system: str, user: str, output: type[T], fixture: T) -> T:
        if self.mock or self.client is None:
            return fixture
        extra: dict[str, Any] = {}
        if os.getenv("ENABLE_REFUSAL_FALLBACK", "1") == "1":
            # Серверный фолбэк при отказе классификатора безопасности: запрос повторяется на другой модели.
            extra = {"extra_headers": {"anthropic-beta": "server-side-fallback-2026-07-01"}, "extra_body": {"fallbacks": "default"}}
        resp = self.client.messages.parse(
            model=MODEL,
            max_tokens=16000,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"effort": EFFORT[agent]},
            output_format=output,
            **extra,
        )
        if resp.stop_reason == "refusal":
            raise RefusalError(f"{agent}: модель отказалась отвечать")
        if resp.parsed_output is None:
            raise ValueError(f"{agent}: пустой структурированный ответ (stop_reason={resp.stop_reason})")
        return resp.parsed_output


ANALYST_SYSTEM = """Ты технический аналитик агентства по закупкам в Китае для клиентов из РФ и Казахстана.
Извлеки параметры только из текста клиента. Если параметр типовой для класса оборудования, а не из текста,
ставь source="standard" и снижай confidence. Ничего не выдумывай. Назначь код ТН ВЭД ЕАЭС с уверенностью.
Отметь требования ЕАЭС (EAC: ТР ТС 010/2011, 004/2011, 020/2011 и др.), санкционные и экспортные риски.
Составь RFQ на английском и упрощённом китайском в деловом стиле 外贸: запроси экспортную цену без НДС
(不含税), EXW и FOB, MOQ, срок, оплату, гарантию, опыт экспорта в РФ/РК и поддержку сертификации."""

HUNTER_SYSTEM = """Ты классифицируешь поставщиков с китайских B2B-площадок. Для каждого реши: производитель или
торговая компания. Признаки трейдера: 经营范围 без 生产/制造/加工, нет адреса цеха, широкий несвязанный
ассортимент, совпадение фото с карточкой другого завода. В evidence перечисли признаки. Оценка 0–100."""

NEGOTIATOR_SYSTEM = """Ты ведёшь переговоры с менеджером китайского завода от имени агентства.
Переведи последнее сообщение завода на русский. Извлеки условия ТОЛЬКО из этого сообщения и укажи его id
в source_message_id. Цена с 含税/含13%增值税 — с НДС, отметь includes_vat=true и попроси экспортную цену.
Подготовь короткий вежливый ответ на китайском. is_binding=true, если ответ содержит цену, объём,
сроки или согласие на сделку — такой ответ отправляет только оператор."""

COSTING_SYSTEM = """Ты пишешь краткое коммерческое предложение клиенту на русском по готовому расчёту.
Не меняй цифры расчёта. Назови рекомендованный завод, цену до двери, срок и 2–4 риска."""


# ───────────────────────────── Состояние ─────────────────────────────

class InboundMessage(TypedDict):
    id: str
    supplier_id: str
    channel: Literal["wechat", "whatsapp", "email"]
    text: str


class SourcingState(TypedDict, total=False):
    order: dict
    rates: dict[str, float]
    analysis: dict
    shortlist: dict
    inbox: Annotated[list[InboundMessage], operator.add]
    processed: Annotated[list[str], operator.add]
    outbox: Annotated[list[dict], operator.add]
    pending_draft: dict | None
    best_terms: dict | None
    deal: bool
    landed: dict
    proposal: dict
    log: Annotated[list[str], operator.add]


llm = Llm()


# ───────────────────────────── Узлы ─────────────────────────────

def route(state: SourcingState) -> str:
    if not state.get("analysis"):
        return "analyst"
    if not state.get("shortlist"):
        return "hunter"
    if not state.get("deal"):
        return "negotiator"
    if not state.get("landed"):
        return "costing"
    return END


def analyst(state: SourcingState) -> SourcingState:
    o = state["order"]
    a = llm.parse("analyst", ANALYST_SYSTEM, f"Товар: {o['title']}\nКоличество: {o['quantity']}\nТекст клиента:\n{o['raw_text']}",
                  SpecAnalysis, fixtures.ANALYSIS)
    return {"analysis": a.model_dump(), "log": [f"analyst: {len(a.specs)} параметров, ТН ВЭД {a.hs.code}"]}


async def hunter(state: SourcingState) -> SourcingState:
    a = SpecAnalysis.model_validate(state["analysis"])
    raw = []
    for src in default_sources():
        raw += [c.model_dump() for c in await src.search(a.rfq_subject_zh, a.rfq_subject_en)]
    sl = llm.parse("hunter", HUNTER_SYSTEM, f"Кандидаты (JSON): {raw}", ShortList, fixtures.SHORTLIST) if raw else fixtures.SHORTLIST
    kept = [c for c in sl.candidates if c.supplier_type == "manufacturer"]
    return {
        "shortlist": {"candidates": [c.model_dump() for c in kept], "rejected": sl.rejected_reasons_ru},
        # RFQ уходит в каналы как служебное сообщение: текст уже проверен на этапе Analyst.
        "outbox": [{"supplier_id": c.supplier_id, "text": a.rfq_zh, "kind": "rfq"} for c in kept[:4]],
        "inbox": fixtures.INBOX if llm.mock else [],
        "log": [f"hunter: {len(kept)} производителей, отсеяно {len(sl.rejected_reasons_ru)}"],
    }


def negotiator(state: SourcingState) -> SourcingState:
    """Разбирает одно новое входящее сообщение завода за проход."""
    done = set(state.get("processed", []))
    new = [m for m in state.get("inbox", []) if m["id"] not in done]
    if not new:
        return {"log": ["negotiator: новых сообщений нет, ждём ответ завода"]}
    m = new[0]
    turn = llm.parse("negotiator", NEGOTIATOR_SYSTEM, f"id={m['id']} канал={m['channel']} завод={m['supplier_id']}\n{m['text']}",
                     NegotiationTurn, fixtures.TURNS[m["id"]])
    out: SourcingState = {"processed": [m["id"]], "log": [f"negotiator: {m['id']} → {turn.translation_ru[:60]}…"]}
    if turn.extracted and turn.extracted.unit_price_cny and not turn.extracted.includes_vat:
        best = state.get("best_terms")
        if not best or turn.extracted.unit_price_cny < best["unit_price_cny"]:
            out["best_terms"] = {**turn.extracted.model_dump(), "supplier_id": m["supplier_id"]}
    if turn.deal_reached:
        out["deal"] = True
    if turn.draft_reply_zh:
        out["pending_draft"] = {"supplier_id": m["supplier_id"], "zh": turn.draft_reply_zh, "ru": turn.draft_reply_ru, "binding": turn.is_binding}
    return out


def human_gate(state: SourcingState) -> SourcingState:
    """Оператор одобряет, правит или отклоняет обязывающий черновик. Возобновление: Command(resume={...})."""
    draft = state["pending_draft"]
    decision = interrupt({"type": "approve_draft", "draft": draft})
    if not decision.get("approved"):
        return {"pending_draft": None, "log": ["operator: черновик отклонён"]}
    return {"pending_draft": {**draft, "zh": decision.get("edited_zh") or draft["zh"], "binding": False, "approved": True},
            "log": ["operator: черновик одобрен"]}


def send_reply(state: SourcingState) -> SourcingState:
    d = state.get("pending_draft")
    if not d:
        return {}
    return {"outbox": [{"supplier_id": d["supplier_id"], "text": d["zh"], "kind": "reply"}], "pending_draft": None}


def after_negotiator(state: SourcingState) -> str:
    d = state.get("pending_draft")
    if d and d.get("binding"):
        return "human_gate"
    if d:
        return "send_reply"
    if state.get("deal"):
        return "costing"
    done = set(state.get("processed", []))
    return "negotiator" if any(m["id"] not in done for m in state.get("inbox", [])) else END


def after_send(state: SourcingState) -> str:
    if state.get("deal"):
        return "costing"
    done = set(state.get("processed", []))
    return "negotiator" if any(m["id"] not in done for m in state.get("inbox", [])) else END


def costing(state: SourcingState) -> SourcingState:
    o, t = state["order"], state["best_terms"] or {}
    a = SpecAnalysis.model_validate(state["analysis"])
    duty = 0.0  # ставка по коду ТН ВЭД из тарифной таблицы; для демо-кода — 0%, сверить с брокером
    result = {d: landed_cost(t["unit_price_cny"], o["quantity"], d, duty, state["rates"]) for d in ("KZ-ALA", "RU-MOW", "RU-EKB")}
    main = result[o["destination"]]
    text = llm.parse("costing", COSTING_SYSTEM, f"Заказ: {o['title']}, {o['quantity']} шт. ТН ВЭД {a.hs.code}. "
                     f"Условия: {t}. Расчёт до двери: {main}", ProposalText, fixtures.PROPOSAL)
    return {"landed": result, "proposal": text.model_dump(), "log": [f"costing: ${main['per_unit_usd']:,.0f} за ед. до двери"]}


def build_graph(checkpointer=None):
    g = StateGraph(SourcingState)
    for name, fn in [("analyst", analyst), ("hunter", hunter), ("negotiator", negotiator), ("human_gate", human_gate),
                     ("send_reply", send_reply), ("costing", costing)]:
        g.add_node(name, fn)
    g.add_conditional_edges(START, route, ["analyst", "hunter", "negotiator", "costing", END])
    g.add_edge("analyst", "hunter")
    g.add_edge("hunter", "negotiator")
    g.add_conditional_edges("negotiator", after_negotiator, ["human_gate", "send_reply", "costing", "negotiator", END])
    g.add_edge("human_gate", "send_reply")
    g.add_conditional_edges("send_reply", after_send, ["costing", "negotiator", END])
    g.add_edge("costing", END)
    # В продакшене: langgraph-checkpoint-postgres (PostgresSaver) на той же базе, что и заявки.
    return g.compile(checkpointer=checkpointer or InMemorySaver())
