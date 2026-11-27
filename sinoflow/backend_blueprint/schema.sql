-- Минимальная схема SinoFlow. Чекпойнты LangGraph создаёт PostgresSaver.setup() в своих таблицах.
CREATE TABLE IF NOT EXISTS orders (
  id            text PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  client        jsonb NOT NULL,
  request       jsonb NOT NULL,              -- OrderIn
  stage         text NOT NULL DEFAULT 'intake',
  offer         jsonb,                        -- цена услуг в 4 валютах + fx_snapshot_id
  paid_at       timestamptz
);

CREATE TABLE IF NOT EXISTS fx_snapshots (
  id         bigserial PRIMARY KEY,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  source     text NOT NULL,                   -- cbr-live | snapshot | manual
  per_usd    jsonb NOT NULL,                  -- {"RUB":..,"KZT":..,"CNY":..,"USD":1}
  valid_until timestamptz NOT NULL            -- курс в оферте фиксируется на 3 дня
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            text PRIMARY KEY,
  name_en       text NOT NULL,
  name_zh       text NOT NULL,
  supplier_type text NOT NULL,                -- manufacturer | trading_company | unknown
  verification  jsonb NOT NULL DEFAULT '{}',
  rating        numeric
);

CREATE TABLE IF NOT EXISTS quotes (
  id                bigserial PRIMARY KEY,
  order_id          text REFERENCES orders(id),
  supplier_id       text REFERENCES suppliers(id),
  unit_price_cny    numeric NOT NULL,
  includes_vat      boolean NOT NULL,
  basis             text NOT NULL,
  lead_time_days    int,
  payment_terms     text,
  source_message_id text NOT NULL,            -- цифра без источника в КП не попадает
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Журнал аудита: каждый вызов модели, инструмент и решение человека. Отсюда — себестоимость заявки.
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  order_id   text REFERENCES orders(id),
  at         timestamptz NOT NULL DEFAULT now(),
  actor      text NOT NULL,                   -- analyst | hunter | negotiator | costing | operator
  kind       text NOT NULL,                   -- llm_call | tool | approval | message
  model      text,
  tokens_in  int,
  tokens_out int,
  cost_usd   numeric,
  payload    jsonb
);
