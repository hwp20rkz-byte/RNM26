create extension if not exists "uuid-ossp";

create table app_user (
    id uuid primary key default uuid_generate_v4(),
    full_name varchar(255) not null,
    personnel_code varchar(32) not null unique,
    phone_e164 varchar(32) not null unique,
    password_hash varchar(255),
    role varchar(32) not null check (role in ('ADMIN', 'CHAIRMAN', 'CLEANER')),
    gamification_score integer not null default 0,
    active boolean not null default true
);

create table building (
    id uuid primary key default uuid_generate_v4(),
    code varchar(32) not null unique
        check (code in ('BLOCK_B', 'BLOCK_A', 'BLOCK_C', 'ANNEX_9A', 'ANNEX_9B', 'PODIUM_ROOF')),
    address varchar(255) not null,
    entrances integer not null default 0
);

create table zone (
    id uuid primary key default uuid_generate_v4(),
    building_id uuid references building(id),
    name varchar(255) not null,
    zone_type varchar(32) not null
        check (zone_type in ('LAWN', 'PATH', 'TBO', 'MAF', 'ENTRANCE', 'GATE', 'STAIRS', 'SPORT', 'PLAYGROUND')),
    geometry_geo_json jsonb not null,
    centroid_lat double precision,
    centroid_lng double precision,
    radius_meters double precision not null default 25.0
);

create table work_template (
    id uuid primary key default uuid_generate_v4(),
    name varchar(255) not null,
    category varchar(64) not null,
    estimated_minutes integer not null,
    reference_photo_url varchar(512),
    checklist_schema_json jsonb not null
);

create table task (
    id uuid primary key default uuid_generate_v4(),
    zone_id uuid not null references zone(id),
    work_template_id uuid not null references work_template(id),
    assignee_id uuid references app_user(id),
    scheduled_date date not null,
    status varchar(32) not null default 'PLANNED'
        check (status in ('PLANNED', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')),
    started_at timestamptz,
    completed_at timestamptz,
    check_in_lat double precision,
    check_in_lng double precision,
    geo_validated boolean not null default false
);

create index idx_task_scheduled_date on task (scheduled_date);
create index idx_task_assignee_date on task (assignee_id, scheduled_date);

create table checklist_item (
    id uuid primary key default uuid_generate_v4(),
    task_id uuid not null references task(id) on delete cascade,
    label varchar(255) not null,
    checked boolean not null default false,
    checked_at timestamptz
);

create table media_attachment (
    id uuid primary key default uuid_generate_v4(),
    task_id uuid not null references task(id) on delete cascade,
    checklist_item_id uuid references checklist_item(id) on delete set null,
    phase varchar(16) not null check (phase in ('BEFORE', 'AFTER')),
    storage_url varchar(1024) not null,
    captured_at timestamptz not null,
    captured_lat double precision,
    captured_lng double precision
);

create table report (
    id uuid primary key default uuid_generate_v4(),
    period varchar(16) not null check (period in ('DAILY', 'WEEKLY', 'MONTHLY')),
    period_start date not null,
    period_end date not null,
    format varchar(8) not null check (format in ('PDF', 'DOCX')),
    status varchar(16) not null default 'PENDING' check (status in ('PENDING', 'READY', 'FAILED')),
    file_url varchar(1024),
    failure_reason text
);

-- Seed: персонал и справочник зданий из требований проекта
insert into building (code, address, entrances) values
    ('BLOCK_B', 'ул. Ақмешіт 9', 2),
    ('BLOCK_A', 'ул. Ақмешіт 9/1', 2),
    ('BLOCK_C', 'ул. Ақмешіт 9/2', 2),
    ('ANNEX_9A', 'ул. Ақмешіт 9А', 0),
    ('ANNEX_9B', 'ул. Ақмешіт 9Б', 0),
    ('PODIUM_ROOF', 'Стилобат / кровля паркинга', 0);

-- [Предположение] Номера телефонов — плейсхолдеры, WhatsApp OTP не заработает,
-- пока их не заменят на реальные E.164-номера Никиты и Владимира.
insert into app_user (full_name, personnel_code, phone_e164, role) values
    ('Никита', 'N', '+70000000001', 'CLEANER'),
    ('Владимир', 'W', '+70000000002', 'CLEANER');
