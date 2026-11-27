"""Мультивалютный движок: та же математика, что в src/lib/currencyEngine.ts.

Расчёты денег детерминированы и не проходят через LLM: модель только пишет текст КП.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx

from .models import Currency, Destination

CURRENCIES: tuple[Currency, ...] = ("RUB", "KZT", "CNY", "USD")
CBR_DAILY_URL = "https://www.cbr-xml-daily.ru/daily_json.js"
SNAPSHOT = {"USD": 1.0, "RUB": 81.5, "KZT": 512.0, "CNY": 7.12}
PRICE_STEP = {"RUB": 100, "KZT": 500, "CNY": 10, "USD": 5}


async def fetch_rates(client: httpx.AsyncClient | None = None) -> tuple[dict[str, float], str]:
    """Курсы ЦБ РФ → единицы валюты за 1 USD. При ошибке — снимок с пометкой источника."""
    own = client is None
    client = client or httpx.AsyncClient(timeout=6)
    try:
        r = await client.get(CBR_DAILY_URL)
        r.raise_for_status()
        v = r.json()["Valute"]
        rub_usd = v["USD"]["Value"] / v["USD"]["Nominal"]
        rub_cny = v["CNY"]["Value"] / v["CNY"]["Nominal"]
        rub_kzt = v["KZT"]["Value"] / v["KZT"]["Nominal"]
        return {"USD": 1.0, "RUB": rub_usd, "CNY": rub_usd / rub_cny, "KZT": rub_usd / rub_kzt}, "cbr-live"
    except (httpx.HTTPError, KeyError, ValueError):
        return dict(SNAPSHOT), "snapshot"
    finally:
        if own:
            await client.aclose()


def convert(amount: float, src: str, dst: str, rates: dict[str, float]) -> float:
    return amount if src == dst else amount / rates[src] * rates[dst]


def to_multi(amount: float, src: str, rates: dict[str, float], fx_spread: float = 0.0, commercial: bool = False) -> dict[str, float]:
    out: dict[str, float] = {}
    for c in CURRENCIES:
        raw = convert(amount, src, c, rates) * (1 if c == src else 1 + fx_spread)
        out[c] = round(raw / PRICE_STEP[c]) * PRICE_STEP[c] if commercial else round(raw, 2)
    return out


SERVICES = {
    "basic_search": {"base": 180, "hours": 2},
    "deep_audit": {"base": 420, "hours": 5},
    "sample_procurement": {"base": 260, "hours": 3},
    "oem_negotiation": {"base": 380, "hours": 4},
    "qc_inspection": {"base": 340, "hours": 8},
    "logistics_customs": {"base": 300, "hours": 3, "pct": 0.015},
}
CATEGORY = {"consumer": 1.0, "industrial": 1.25, "machinery": 1.5}
RUSH = {"standard": 1.0, "rush": 1.35}


def price_services(services: list[str], category: str, urgency: str, goods_value_usd: float, rates: dict[str, float],
                   margin: float = 0.3, fx_spread: float = 0.015) -> dict:
    lines = []
    for sid in services:
        s = SERVICES[sid]
        if "pct" in s:
            cost = max(s["base"], goods_value_usd * s["pct"]) * RUSH[urgency]
        else:
            cost = s["base"] * CATEGORY[category] * RUSH[urgency]
        price_usd = round(cost * (1 + margin) / 5) * 5
        lines.append({"service": sid, "cost_usd": round(cost, 2), "price_usd": price_usd,
                      "price": to_multi(price_usd, "USD", rates, fx_spread, commercial=True)})
    total = {c: sum(l["price"][c] for l in lines) for c in CURRENCIES}
    return {"lines": lines, "total": total, "total_usd": sum(l["price_usd"] for l in lines)}


@dataclass(frozen=True)
class Logistics:
    containers: int
    freight_per_container_usd: float
    vat_rate: float  # параметр профиля: сверять с брокером перед КП
    customs_fees_usd: float
    broker_usd: float
    certification_usd: float


LOGISTICS: dict[Destination, Logistics] = {
    "KZ-ALA": Logistics(2, 4600, 0.16, 180, 450, 1400),
    "RU-MOW": Logistics(2, 7900, 0.22, 380, 600, 1400),
    "RU-EKB": Logistics(2, 6900, 0.22, 380, 550, 1400),
}


def landed_cost(unit_price_cny: float, quantity: int, dest: Destination, duty_rate: float,
                rates: dict[str, float], commission: float = 0.03) -> dict:
    p = LOGISTICS[dest]
    goods = convert(unit_price_cny * quantity, "CNY", "USD", rates)
    freight = p.containers * p.freight_per_container_usd
    insurance = (goods + freight) * 0.003
    customs_value = goods + freight + insurance
    duty = customs_value * duty_rate
    vat = (customs_value + duty) * p.vat_rate
    lines = [
        ("goods", "Товар", goods), ("freight", "Фрахт", freight), ("insurance", "Страхование 0,3%", insurance),
        ("duty", "Пошлина", duty), ("vat", "Импортный НДС", vat),
        ("customs", "Таможенные сборы и брокер", p.customs_fees_usd + p.broker_usd),
        ("cert", "Сертификация EAC", p.certification_usd), ("commission", "Сопровождение заказа", goods * commission),
    ]
    total = sum(v for *_, v in lines)
    return {
        "destination": dest, "quantity": quantity,
        "lines": [{"key": k, "label_ru": l, "usd": round(v, 2)} for k, l, v in lines],
        "total_usd": round(total, 2), "per_unit_usd": round(total / quantity, 2),
        "total": to_multi(total, "USD", rates), "per_unit": to_multi(total / quantity, "USD", rates),
    }
