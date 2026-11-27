"""Фикстуры демо-кейса (VMC850 × 3, Алматы) для MOCK_LLM-режима и тестов. Те же данные, что во фронтенде."""
from .models import (
    Candidate, ComplianceFlag, HsCode, NegotiationTurn, ProposalText, ShortList, SpecAnalysis, SpecItem, Terms,
)

ANALYSIS = SpecAnalysis(
    specs=[
        SpecItem(key="travel", label_ru="Ходы X/Y/Z", label_zh="行程 X/Y/Z", value="800/500/550 мм", confidence=0.96, source="client_text"),
        SpecItem(key="spindle", label_ru="Шпиндель", label_zh="主轴", value="BT40, 8000 об/мин, 11 кВт", confidence=0.92, source="client_text"),
        SpecItem(key="atc", label_ru="Магазин инструмента", label_zh="刀库", value="24 позиции", confidence=0.9, source="client_text"),
        SpecItem(key="cnc", label_ru="Система ЧПУ", label_zh="数控系统", value="FANUC 0i-MF Plus", confidence=0.94, source="client_text"),
        SpecItem(key="table", label_ru="Стол", label_zh="工作台", value="1000×500 мм, 500 кг", confidence=0.81, source="standard"),
    ],
    hs=HsCode(code="8457 10 900 0", description_ru="Центры обрабатывающие для металла, прочие", confidence=0.84),
    compliance=[
        ComplianceFlag(severity="warn", text_ru="EAC: ТР ТС 010/2011, 004/2011, 020/2011"),
        ComplianceFlag(severity="warn", text_ru="FANUC: возможны ограничения реэкспорта в РФ"),
    ],
    clarifying_questions_ru=["4-я ось: стол сразу или только подготовка?", "Нужна СОЖ через шпиндель?"],
    rfq_subject_en="RFQ — VMC850 × 3 sets (FANUC), export to Kazakhstan",
    rfq_subject_zh="询价 — 立式加工中心 VMC850 × 3 台（发那科系统）",
    rfq_en="Please quote EXW and FOB Qingdao, export price excluding VAT, MOQ, lead time, payment terms, warranty, EAC support.",
    rfq_zh="请报出厂价（EXW）及青岛 FOB 价（出口不含税）、起订量、交期、付款方式、保修，以及是否能配合 EAC 认证。",
)

SHORTLIST = ShortList(
    candidates=[
        Candidate(supplier_id="ruiheng", name_en="Tengzhou Ruiheng CNC Machine Tool Co., Ltd.", name_zh="滕州瑞恒数控机床有限公司",
                  marketplace="1688", supplier_type="manufacturer", business_scope_zh="数控机床制造、销售", price_min_cny=205000,
                  price_max_cny=228000, moq=1, evidence=["经营范围 включает 制造", "видео-аудит цеха 32 000 м²"], score=93),
        Candidate(supplier_id="hanwei", name_en="Suzhou Hanwei Intelligent Equipment Co., Ltd.", name_zh="苏州汉威智能装备有限公司",
                  marketplace="alibaba", supplier_type="manufacturer", business_scope_zh="智能装备生产", price_min_cny=232000,
                  price_max_cny=255000, moq=1, evidence=["собственный завод", "опыт EAC"], score=89),
        Candidate(supplier_id="zhongcheng", name_en="Jinan Zhongcheng Machinery Trading Co., Ltd.", name_zh="济南众诚机械贸易有限公司",
                  marketplace="alibaba", supplier_type="trading_company", business_scope_zh="机械设备销售", price_min_cny=219000,
                  price_max_cny=240000, moq=1, evidence=["经营范围 только 销售", "фото совпадают с Ruiheng"], score=41),
    ],
    rejected_reasons_ru={"zhongcheng": "Торговая компания: станок Ruiheng с наценкой около 7%"},
)

INBOX = [
    {"id": "w2", "supplier_id": "ruiheng", "channel": "wechat", "text": "VMC850 发那科 0i-MF Plus，单台出厂价 228,000 元（含 13% 增值税）。交期 45 天。"},
    {"id": "a2", "supplier_id": "hanwei", "channel": "whatsapp", "text": "VMC850 with Siemens 828D: USD 34,800/set FOB Shanghai. Lead time 50 days."},
    {"id": "w4", "supplier_id": "ruiheng", "channel": "wechat", "text": "出口不含税价 202,000 元/台（EXW）。青岛 FOB 每台加 2,800 元。"},
    {"id": "w6", "supplier_id": "ruiheng", "channel": "wechat", "text": "FOB 青岛 200,500 元/台，含木箱包装，交期 40 天。70% 见提单副本可以接受。"},
    {"id": "a4", "supplier_id": "hanwei", "channel": "whatsapp", "text": "Best we can do: USD 33,200/set FOB Shanghai, 45 days."},
]

TURNS = {
    "w2": NegotiationTurn(
        extracted=Terms(unit_price_cny=228000, includes_vat=True, basis="EXW", port="Тэнчжоу", lead_time_days=45, source_message_id="w2"),
        translation_ru="228 000 юаней за станок EXW, с НДС 13%. Срок 45 дней.",
        draft_reply_zh="谢谢！我们是出口，请报不含税价格，并报青岛港 FOB 价。", draft_reply_ru="Это экспорт: прошу цену без НДС и FOB Циндао.",
        is_binding=False,
    ),
    "a2": NegotiationTurn(
        extracted=Terms(unit_price_cny=247776, includes_vat=False, basis="FOB", port="Шанхай", lead_time_days=50, source_message_id="a2"),
        translation_ru="$34 800 за станок FOB Шанхай, Siemens 828D, 50 дней.",
        draft_reply_zh="Thanks Kevin. Can you get closer for 3 sets?", draft_reply_ru="Сможете улучшить цену для 3 станков?",
        is_binding=False,
    ),
    "w4": NegotiationTurn(
        extracted=Terms(unit_price_cny=204800, includes_vat=False, basis="FOB", port="Циндао", source_message_id="w4"),
        translation_ru="Экспортная цена без НДС 202 000 юаней EXW, FOB Циндао +2 800 за станок.",
        draft_reply_zh="王经理，3 台 FOB 青岛，我们的目标价是 198,000 元/台。交期能否 35 天？付款 30% 定金、70% 见提单副本。",
        draft_reply_ru="Цель 198 000 юаней FOB Циндао, 35 дней, 30/70 против копии коносамента.",
        is_binding=True,
    ),
    "w6": NegotiationTurn(
        extracted=Terms(unit_price_cny=200500, includes_vat=False, basis="FOB", port="Циндао", lead_time_days=40,
                        payment_terms="30% аванс / 70% против копии B/L", source_message_id="w6"),
        translation_ru="200 500 юаней FOB Циндао с упаковкой, 40 дней, 70% против копии коносамента — согласны.",
        draft_reply_zh="成交！请发形式发票（PI）。", draft_reply_ru="Договорились! Пришлите проформу.",
        is_binding=True, deal_reached=True,
    ),
    "a4": NegotiationTurn(
        extracted=Terms(unit_price_cny=236384, includes_vat=False, basis="FOB", port="Шанхай", lead_time_days=45, source_message_id="a4"),
        translation_ru="$33 200 FOB Шанхай, 45 дней.", is_binding=False,
    ),
}

PROPOSAL = ProposalText(
    summary_ru="Рекомендуем Tengzhou Ruiheng: FOB Циндао 200 500 юаней за станок, 40 дней производства, оплата 30/70 против копии коносамента.",
    risks_ru=["Сертификация EAC до отгрузки", "Ставка пошлины и НДС — подтвердить у брокера", "Курс фиксируется в оферте на 3 дня"],
)
