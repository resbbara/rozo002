import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [{ data: settings }, { data: emails }] = await Promise.all([
    supabaseAdmin.from('app_settings').select('resend_api_key, updated_at').eq('id', 1).single(),
    supabaseAdmin.from('notification_emails').select('*').order('created_at'),
  ])
  return NextResponse.json({ settings, emails })
}

export async function POST(req: NextRequest) {
  const { resend_api_key } = await req.json()
  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({ resend_api_key, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
