import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  const { type } = await req.json() // 'email' | 'push' | 'all'
  const results: Record<string, string> = {}

  const { data: settings } = await supabaseAdmin.from('app_settings').select('resend_api_key').eq('id', 1).single()
  const { data: emails } = await supabaseAdmin.from('notification_emails').select('email').eq('is_active', true)
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*')

  // 이메일 테스트
  if (type === 'email' || type === 'all') {
    const apiKey = settings?.resend_api_key || process.env.RESEND_API_KEY
    if (!apiKey) {
      results.email = 'RESEND_API_KEY 없음'
    } else if (!emails?.length) {
      results.email = '수신 이메일 없음'
    } else {
      try {
        const resend = new Resend(apiKey)
        await resend.emails.send({
          from: 'URLMonitor <onboarding@resend.dev>',
          to: emails.map(e => e.email),
          subject: '[URLMonitor] 테스트 알림',
          html: '<p>URL Monitor 이메일 알림 테스트입니다. 정상 동작 중입니다.</p>',
        })
        results.email = `발송 완료 (${emails.length}명)`
      } catch (e) {
        results.email = `오류: ${e instanceof Error ? e.message : String(e)}`
      }
    }
  }

  // Push 테스트
  if (type === 'push' || type === 'all') {
    if (!subs?.length) {
      results.push = '구독된 브라우저 없음'
    } else {
      webpush.setVapidDetails(
        'mailto:' + (process.env.NOTIFY_EMAIL ?? 'admin@example.com'),
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      )
      const payload = JSON.stringify({ title: '[URLMonitor] 테스트 알림', body: 'Push 알림이 정상 동작 중입니다.' })
      const sent = await Promise.allSettled(
        subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
      )
      const ok = sent.filter(r => r.status === 'fulfilled').length
      results.push = `${ok}/${subs.length} 발송 완료`
    }
  }

  return NextResponse.json(results)
}
