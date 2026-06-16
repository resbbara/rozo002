-- URL 모니터링 앱 스키마
-- Supabase SQL Editor에서 실행하세요

create table if not exists monitored_urls (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null,
  selector text,                    -- CSS 셀렉터 (null이면 전체 텍스트)
  interval_minutes integer not null default 60,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_hash text,
  last_content text,
  created_at timestamptz not null default now()
);

create table if not exists check_history (
  id uuid primary key default gen_random_uuid(),
  url_id uuid not null references monitored_urls(id) on delete cascade,
  checked_at timestamptz not null default now(),
  has_changed boolean not null default false,
  content_snapshot text,
  diff_summary text,
  error text
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists check_history_url_id_idx on check_history(url_id, checked_at desc);
create index if not exists monitored_urls_active_idx on monitored_urls(is_active, last_checked_at);
