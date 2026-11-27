"""Smoke-тест графа на фикстурах: два прерывания на подтверждение оператора, затем КП."""
import os

os.environ["MOCK_LLM"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ORDER = {
    "client_company": "ТОО «АлматыМашСервис»",
    "title": "VMC-850",
    "raw_text": "Нужны 3 обрабатывающих центра VMC850 под FANUC",
    "quantity": 3,
    "target_price": {"amount": 32000, "currency": "USD"},
    "destination": "KZ-ALA",
    "category": "machinery",
    "services": ["basic_search", "deep_audit", "oem_negotiation", "logistics_customs"],
}


def test_full_flow_with_human_in_the_loop():
    c = TestClient(app)
    oid = c.post("/orders", json=ORDER).json()["order_id"]

    s = c.post(f"/orders/{oid}/run").json()
    assert s["waiting_for_operator"], "граф должен остановиться на контрпредложении"
    assert "198,000" in s["waiting_for_operator"][0]["draft"]["zh"]

    s = c.post(f"/orders/{oid}/approve", json={"approved": True}).json()
    assert s["waiting_for_operator"][0]["draft"]["zh"].startswith("成交")  # согласие на сделку — тоже через оператора

    s = c.post(f"/orders/{oid}/approve", json={"approved": True}).json()
    assert s["deal"] is True
    assert s["best_terms"]["unit_price_cny"] == 200500
    kz = s["landed"]["KZ-ALA"]
    assert kz["per_unit_usd"] > 30000
    assert set(kz["per_unit"]) == {"RUB", "KZT", "CNY", "USD"}
    kinds = [o["kind"] for o in s["outbox"]]
    assert kinds.count("rfq") == 2 and kinds.count("reply") == 4


def test_services_quote_has_four_currencies():
    c = TestClient(app)
    q = c.post("/quotes/services", json={"services": ["basic_search", "logistics_customs"], "category": "machinery", "goods_value": 96000}).json()
    assert set(q["total"]) == {"RUB", "KZT", "CNY", "USD"}
    assert q["lines"][1]["cost_usd"] == 1440.0  # 1,5% от товара, без коэффициента категории


def test_webhook_rejects_unsigned():
    os.environ["WEBHOOK_SECRET"] = ""
    c = TestClient(app)
    assert c.post("/webhooks/inbound", content=b"{}").status_code in (401, 503)
