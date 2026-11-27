"""FastAPI-шлюз SinoFlow.

Запуск: uvicorn app.main:app --reload   (без ANTHROPIC_API_KEY работает на фикстурах)

Эндпоинты:
  GET  /health                     — живость
  GET  /rates                      — курсы ЦБ РФ (или снимок) в единицах за 1 USD
  POST /quotes/services            — цена услуг в ₽ ₸ ¥ $
  POST /orders                     — создать заявку
  POST /orders/{id}/run            — запустить/продолжить граф агентов
  POST /orders/{id}/approve        — решение оператора по обязывающему черновику (resume interrupt)
  GET  /orders/{id}                — состояние заявки
  WS   /orders/{id}/events         — поток обновлений графа для UI
  POST /webhooks/inbound           — входящее сообщение завода от Chatwoot/WeCom/WhatsApp, с HMAC-подписью
"""
from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from langgraph.types import Command
from pydantic import BaseModel

from .agents import build_graph
from .currency import convert, fetch_rates, price_services
from .models import OrderIn

app = FastAPI(title="SinoFlow AI", version="0.1.0")
graph = build_graph()
ORDERS: dict[str, dict[str, Any]] = {}  # В продакшене — таблица orders в PostgreSQL (см. schema.sql)
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


def cfg(order_id: str) -> dict:
    return {"configurable": {"thread_id": order_id}}


async def snapshot(order_id: str) -> dict:
    s = await graph.aget_state(cfg(order_id))
    interrupts = [i.value for i in getattr(s, "interrupts", ())]
    v = s.values or {}
    return {
        "order_id": order_id,
        "next": list(s.next),
        "waiting_for_operator": interrupts,
        "best_terms": v.get("best_terms"),
        "deal": v.get("deal", False),
        "landed": v.get("landed"),
        "proposal": v.get("proposal"),
        "outbox": v.get("outbox", []),
        "log": v.get("log", []),
    }


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/rates")
async def rates() -> dict:
    r, source = await fetch_rates()
    return {"base": "USD", "per_usd": r, "source": source}


class ServicesQuoteIn(BaseModel):
    services: list[str]
    category: str = "industrial"
    urgency: str = "standard"
    goods_value: float
    goods_currency: str = "USD"
    margin: float = 0.3


@app.post("/quotes/services")
async def quote_services(body: ServicesQuoteIn) -> dict:
    r, source = await fetch_rates()
    goods_usd = convert(body.goods_value, body.goods_currency, "USD", r)
    return {"rates_source": source, **price_services(body.services, body.category, body.urgency, goods_usd, r, body.margin)}


@app.post("/orders", status_code=201)
async def create_order(body: OrderIn) -> dict:
    order_id = f"SF-{uuid.uuid4().hex[:8]}"
    ORDERS[order_id] = {"order": body.model_dump()}
    return {"order_id": order_id}


@app.post("/orders/{order_id}/run")
async def run_order(order_id: str) -> dict:
    o = ORDERS.get(order_id)
    if not o:
        raise HTTPException(404, "order not found")
    r, _ = await fetch_rates()
    await graph.ainvoke({"order": o["order"], "rates": r}, cfg(order_id))
    return await snapshot(order_id)


class ApprovalIn(BaseModel):
    approved: bool
    edited_zh: str | None = None


@app.post("/orders/{order_id}/approve")
async def approve(order_id: str, body: ApprovalIn) -> dict:
    s = await graph.aget_state(cfg(order_id))
    if not getattr(s, "interrupts", ()):
        raise HTTPException(409, "nothing to approve")
    await graph.ainvoke(Command(resume=body.model_dump()), cfg(order_id))
    return await snapshot(order_id)


@app.get("/orders/{order_id}")
async def get_order(order_id: str) -> dict:
    if order_id not in ORDERS:
        raise HTTPException(404, "order not found")
    return await snapshot(order_id)


@app.websocket("/orders/{order_id}/events")
async def events(ws: WebSocket, order_id: str) -> None:
    await ws.accept()
    try:
        o = ORDERS.get(order_id)
        if not o:
            await ws.close(code=4404)
            return
        r, _ = await fetch_rates()
        async for chunk in graph.astream({"order": o["order"], "rates": r}, cfg(order_id), stream_mode="updates"):
            for node, update in chunk.items():
                await ws.send_json({"node": node, "log": (update or {}).get("log", []) if isinstance(update, dict) else []})
        await ws.send_json({"done": True, **(await snapshot(order_id))})
    except WebSocketDisconnect:
        pass


class InboundIn(BaseModel):
    order_id: str
    message_id: str
    supplier_id: str
    channel: str
    text: str


@app.post("/webhooks/inbound")
async def inbound(request: Request, x_signature: str = Header(default="")) -> dict:
    """Сообщение завода. Подпись: hex(HMAC-SHA256(WEBHOOK_SECRET, raw_body)). Без секрета эндпоинт закрыт."""
    raw = await request.body()
    if not WEBHOOK_SECRET:
        raise HTTPException(503, "webhook secret is not configured")
    expected = hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_signature):
        raise HTTPException(401, "bad signature")
    m = InboundIn.model_validate_json(raw)
    if m.order_id not in ORDERS:
        raise HTTPException(404, "order not found")
    msg = {"id": m.message_id, "supplier_id": m.supplier_id, "channel": m.channel, "text": m.text}
    await graph.ainvoke({"inbox": [msg]}, cfg(m.order_id))
    return await snapshot(m.order_id)
