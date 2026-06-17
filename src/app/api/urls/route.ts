import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('monitored_urls')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, name, selector, interval_minutes, extra_emails, min_change_percent, keywords } = body

  if (!url || !name) return NextResponse.json({ error: 'url, name 필수' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('monitored_urls')
    .insert({
      url,
      name,
      selector: selector || null,
      interval_minutes: interval_minutes ?? 60,
      extra_emails: Array.isArray(extra_emails) ? extra_emails : [],
      min_change_percent: Number(min_change_percent) || 0,
      keywords: Array.isArray(keywords) ? keywords : [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
