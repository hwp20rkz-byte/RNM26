"""Pydantic-модели: зеркало src/types/sourcing.ts фронтенда.

Структурированные выходы агентов (SpecAnalysis, ShortList, NegotiationTurn, ProposalText)
передаются в `client.messages.parse(output_format=...)`, поэтому SDK валидирует ответ Claude.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

Currency = Literal["RUB", "KZT", "CNY", "USD"]
Destination = Literal["KZ-ALA", "RU-MOW", "RU-EKB"]
Incoterm = Literal["EXW", "FOB", "FCA"]
ServiceId = Literal[
    "basic_search", "deep_audit", "sample_procurement", "oem_negotiation", "qc_inspection", "logistics_customs"
]


class Money(BaseModel):
    amount: float
    currency: Currency


class OrderIn(BaseModel):
    client_company: str
    title: str
    raw_text: str = Field(description="Свободный текст заявки клиента")
    quantity: int = Field(ge=1)
    target_price: Money
    destination: Destination
    incoterm: Incoterm = "FOB"
    urgency: Literal["standard", "rush"] = "standard"
    category: Literal["consumer", "industrial", "machinery"] = "industrial"
    services: list[ServiceId]


class Stage(str, Enum):
    intake = "intake"
    analyst = "analyst"
    hunter = "hunter"
    negotiator = "negotiator"
    waiting_human = "waiting_human"
    costing = "costing"
    proposal_ready = "proposal_ready"


# ───────────── Agent 1 ─────────────
class SpecItem(BaseModel):
    key: str
    label_ru: str
    label_zh: str
    value: str
    confidence: float = Field(ge=0, le=1)
    source: Literal["client_text", "inferred", "standard"]


class HsCode(BaseModel):
    code: str = Field(description="10 знаков ТН ВЭД ЕАЭС, с пробелами: '8457 10 900 0'")
    description_ru: str
    confidence: float = Field(ge=0, le=1)


class ComplianceFlag(BaseModel):
    severity: Literal["info", "warn", "block"]
    text_ru: str


class SpecAnalysis(BaseModel):
    specs: list[SpecItem]
    hs: HsCode
    compliance: list[ComplianceFlag]
    clarifying_questions_ru: list[str]
    rfq_subject_en: str
    rfq_subject_zh: str
    rfq_en: str
    rfq_zh: str = Field(description="RFQ на упрощённом китайском, деловой стиль 外贸")


# ───────────── Agent 2 ─────────────
class Candidate(BaseModel):
    supplier_id: str
    name_en: str
    name_zh: str
    marketplace: Literal["1688", "alibaba", "made-in-china", "own_site"]
    supplier_type: Literal["manufacturer", "trading_company", "unknown"]
    business_scope_zh: str | None = Field(default=None, description="经营范围 из лицензии; '销售' без '生产/制造' — признак трейдера")
    price_min_cny: float
    price_max_cny: float
    moq: int
    evidence: list[str] = Field(description="Признаки, на которых основан тип и оценка")
    score: int = Field(ge=0, le=100)


class ShortList(BaseModel):
    candidates: list[Candidate]
    rejected_reasons_ru: dict[str, str] = Field(default_factory=dict)


# ───────────── Agent 3 ─────────────
class Terms(BaseModel):
    unit_price_cny: float | None = None
    includes_vat: bool | None = None
    basis: Incoterm | None = None
    port: str | None = None
    moq: int | None = None
    lead_time_days: int | None = None
    payment_terms: str | None = None
    source_message_id: str = Field(description="Обязательная ссылка на сообщение завода, из которого взяты цифры")


class NegotiationTurn(BaseModel):
    extracted: Terms | None = Field(default=None, description="Что завод предложил в последнем сообщении")
    translation_ru: str
    draft_reply_zh: str | None = Field(default=None, description="Черновик ответа заводу на китайском")
    draft_reply_ru: str | None = None
    is_binding: bool = Field(description="True, если черновик содержит цену, объём или сроки — тогда нужен оператор")
    deal_reached: bool = False


# ───────────── Agent 4 ─────────────
class LandedLine(BaseModel):
    key: str
    label_ru: str
    usd: float


class LandedCost(BaseModel):
    destination: Destination
    quantity: int
    lines: list[LandedLine]
    total_usd: float
    per_unit_usd: float
    total: dict[Currency, float]
    per_unit: dict[Currency, float]


class ProposalText(BaseModel):
    summary_ru: str = Field(description="3–5 предложений для клиента: рекомендация, цена, сроки, риски")
    risks_ru: list[str]
