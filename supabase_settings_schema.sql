-- 설정 테이블 (단일 행 싱글톤)
create table if not exists app_settings (
  id integer primary key default 1 check (id = 1),  -- 항상 1행만 존재
  resend_api_key text,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1) on conflict do nothing;

-- 이메일 수신자 목록
create table if not exists notification_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- URL별 알림 설정 (monitored_urls에 컬럼 추가)
alter table monitored_urls
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_push boolean not null default true;
