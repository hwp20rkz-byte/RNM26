# SinoFlow AI: бэкенд-блюпринт (FastAPI + LangGraph)

Рабочий каркас бэкенда для прототипа из `../src`. Без ключа API граф запускается на фикстурах демо-кейса, поэтому его можно прогнать локально и в CI без затрат.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
MOCK_LLM=1 python -m pytest -q tests     # 3 теста: полный цикл с двумя подтверждениями оператора
uvicorn app.main:app --reload            # http://localhost:8000/docs
docker compose up --build                # API + PostgreSQL + Valkey + Crawl4AI (нужен .env из .env.example)
```

## Граф агентов

```
START ─▶ route ─▶ analyst ─▶ hunter ─▶ negotiator ─┬─▶ human_gate ─▶ send_reply ─▶ negotiator
                                                    ├─▶ costing ─▶ END        (сделка достигнута)
                                                    └─▶ END                   (ждём ответ завода)
```

| Узел | Что делает | Выход (Pydantic) | effort |
|---|---|---|---|
| `analyst` | Параметры из свободного текста, ТН ВЭД, EAC и санкционные флаги, RFQ на EN и 中文 | `SpecAnalysis` | high |
| `hunter` | Кандидаты из адаптеров источников, классификация «производитель / трейдер» по 经营范围 и другим признакам | `ShortList` | low |
| `negotiator` | Одно входящее сообщение за проход: перевод, извлечение условий со ссылкой на сообщение, черновик ответа | `NegotiationTurn` | high |
| `human_gate` | `interrupt()` для обязывающих черновиков (цена, объём, срок, согласие на сделку) | решение оператора | — |
| `costing` | Детерминированный расчёт до двери в ₽ ₸ ¥ $ + текст КП от модели | `ProposalText` | medium |

## Решения, которые легко сделать неправильно

1. **Деньги считает код, а не модель.** `currency.py` повторяет математику `src/lib/currencyEngine.ts`; модель получает готовые цифры и пишет только текст.
2. **У каждой цифры есть источник.** `Terms.source_message_id` обязателен; таблица `quotes` хранит его, КП без него не собирается.
3. **`interrupt()` вынесен в отдельный узел.** При возобновлении LangGraph перезапускает узел с начала. Если бы прерывание стояло внутри `negotiator`, LLM-вызов перед ним повторялся бы и стоил денег.
4. **Граф возобновляемый.** Ответ завода приходит вебхуком через часы или дни: `POST /webhooks/inbound` добавляет сообщение в `inbox`, а `route` продолжает с нужного агента в том же `thread_id`.
5. **Источники данных — адаптеры с правовым основанием** (`sources.py`): 1688 Open Platform, лицензированный фид, Crawl4AI только для собственных сайтов заводов. Серверный парсинг Alibaba и 1688 не делаем: это нарушает их правила.
6. **Модель.** По умолчанию `claude-opus-5-5`; глубина настраивается `output_config.effort` по агенту, а не сменой модели. Включён серверный фолбэк при отказе классификатора (`ENABLE_REFUSAL_FALLBACK=1`, beta `server-side-fallback-2026-07-01`); его можно выключить.
7. **Вебхуки подписаны.** HMAC-SHA256 от тела запроса в заголовке `X-Signature`; без `WEBHOOK_SECRET` эндпоинт отвечает 503.

## Что заменить перед продакшеном

- `InMemorySaver` → `PostgresSaver` из `langgraph-checkpoint-postgres` на той же базе, что `schema.sql`.
- `ORDERS` в `main.py` → таблица `orders`.
- `Official1688Adapter.search` — реализовать после одобрения приложения на open.1688.com (подпись AppKey/AppSecret, квоты).
- Адаптеры каналов: Chatwoot (WhatsApp Cloud API, почта, Telegram) и свой канал WeCom через API Chatwoot; исходящие сообщения из `outbox`.
- Twenty CRM: синхронизация клиентов и сделок через его API (AGPL-3.0: изменения самого Twenty в SaaS нужно публиковать).
- Тег образа `unclecode/crawl4ai` закрепить и сверить формат `/crawl` с версией образа.
- Ставки пошлины и НДС в `LOGISTICS` — параметры, сверяются с брокером.
