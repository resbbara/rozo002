-- ===========================================
-- URL 모니터링 앱 전체 스키마 (통합본)
-- 새 Supabase 프로젝트의 SQL Editor에서 한 번에 실행하세요
-- ===========================================

-- 모니터링 대상 URL
create table if not exists monitored_urls (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null,
  selector text,
  interval_minutes integer not null default 60,
  is_active boolean not null default true,
  notify_email boolean not null default true,    -- 대표 이메일에도 발송
  notify_push boolean not null default true,
  extra_emails text[] not null default '{}',     -- 이 URL 전용 이메일 목록
  min_change_percent integer not null default 0, -- 변경 감지 민감도 (이 % 이상 바뀔 때만 알림, 0=항상)
  keywords text[] not null default '{}',         -- 키워드 감지 (등장/사라짐 시에만 알림, 비어있으면 미사용)
  last_checked_at timestamptz,
  last_hash text,
  last_content text,
  created_at timestamptz not null default now()
);

-- 변경 이력
create table if not exists check_history (
  id uuid primary key default gen_random_uuid(),
  url_id uuid not null references monitored_urls(id) on delete cascade,
  checked_at timestamptz not null default now(),
  has_changed boolean not null default false,
  content_snapshot text,
  diff_summary text,
  error text,
  screenshot_url text                            -- 이 시점 화면 스크린샷 (Storage 공개 URL)
);

-- 브라우저 Push 구독
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 앱 설정 (단일 행 싱글톤)
create table if not exists app_settings (
  id integer primary key default 1 check (id = 1),
  resend_api_key text,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1) on conflict do nothing;

-- 대표 이메일 수신자 목록
create table if not exists notification_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists check_history_url_id_idx on check_history(url_id, checked_at desc);
create index if not exists monitored_urls_active_idx on monitored_urls(is_active, last_checked_at);

-- 기존 테이블이 이미 있는 경우를 위한 컬럼 보정
alter table monitored_urls
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_push boolean not null default true,
  add column if not exists extra_emails text[] not null default '{}',
  add column if not exists min_change_percent integer not null default 0,
  add column if not exists keywords text[] not null default '{}';
