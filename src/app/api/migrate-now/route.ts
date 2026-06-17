import { NextRequest, NextResponse } from 'next/server'
import pkg from 'pg'
const { Client } = pkg

export async function POST(req: NextRequest) {
  if (req.headers.get('x-migrate-key') !== 'rozo002-migrate-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const client = new Client({
    connectionString: process.env.PG_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()

    await client.query(`
      create table if not exists monitored_urls (
        id uuid primary key default gen_random_uuid(),
        url text not null unique,
        name text not null,
        selector text,
        interval_minutes integer not null default 60,
        is_active boolean not null default true,
        notify_email boolean not null default true,
        notify_push boolean not null default true,
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
      create table if not exists app_settings (
        id integer primary key default 1 check (id = 1),
        resend_api_key text,
        updated_at timestamptz not null default now()
      );
      insert into app_settings (id) values (1) on conflict do nothing;
      create table if not exists notification_emails (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        is_active boolean not null default true,
        created_at timestamptz not null default now()
      );
      create index if not exists check_history_url_id_idx on check_history(url_id, checked_at desc);
      create index if not exists monitored_urls_active_idx on monitored_urls(is_active, last_checked_at);
    `)

    const { rows } = await client.query(`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name
    `)

    return NextResponse.json({ success: true, tables: rows.map((r: {table_name: string}) => r.table_name) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  } finally {
    await client.end().catch(() => {})
  }
}
