import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkUrl } from '@/lib/checker'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const { data: urls } = await supabaseAdmin
    .from('monitored_urls')
    .select('id, interval_minutes, last_checked_at')
    .eq('is_active', true)

  if (!urls) return NextResponse.json({ checked: 0 })

  const due = urls.filter(u => {
    if (!u.last_checked_at) return true
    const next = new Date(u.last_checked_at).getTime() + u.interval_minutes * 60 * 1000
    return now.getTime() >= next
  })

  const results = await Promise.allSettled(due.map(u => checkUrl(u.id)))

  return NextResponse.json({
    checked: due.length,
    results: results.map(r => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })),
  })
}
