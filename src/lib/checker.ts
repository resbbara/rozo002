import { supabaseAdmin } from './supabase'
import { crawlUrl, computeDiff } from './crawler'
import webpush from 'web-push'
import { Resend } from 'resend'

export async function checkUrl(urlId: string) {
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('monitored_urls')
    .select('*')
    .eq('id', urlId)
    .single()

  if (fetchErr || !row) throw new Error('URL 레코드 없음')

  let content = ''
  let hash = ''
  let crawlError: string | undefined

  try {
    const result = await crawlUrl(row.url, row.selector)
    content = result.content
    hash = result.hash
  } catch (e) {
    crawlError = e instanceof Error ? e.message : String(e)
  }

  const hasChanged = !crawlError && row.last_hash !== null && hash !== row.last_hash
  const diff = hasChanged ? computeDiff(row.last_content ?? '', content) : { hasChanged: false, diffSummary: null }

  // 이력 저장
  await supabaseAdmin.from('check_history').insert({
    url_id: urlId,
    has_changed: hasChanged,
    content_snapshot: content || null,
    diff_summary: diff.diffSummary,
    error: crawlError ?? null,
  })

  // URL 상태 업데이트
  if (!crawlError) {
    await supabaseAdmin
      .from('monitored_urls')
      .update({ last_checked_at: new Date().toISOString(), last_hash: hash, last_content: content })
      .eq('id', urlId)
  } else {
    await supabaseAdmin
      .from('monitored_urls')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', urlId)
  }

  // 변경 감지 시 알림
  if (hasChanged) {
    await sendNotifications(row.name, row.url, diff.diffSummary ?? '변경 감지됨')
  }

  return { hasChanged, diffSummary: diff.diffSummary, error: crawlError }
}

async function sendNotifications(name: string, url: string, summary: string) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.NOTIFY_EMAIL ?? 'admin@example.com'),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const resend = new Resend(process.env.RESEND_API_KEY)
  const payload = JSON.stringify({ title: `[변경] ${name}`, body: summary, url })

  // 브라우저 Push
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*')
  if (subs) {
    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ),
      ),
    )
  }

  // 이메일
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
    await resend.emails.send({
      from: 'URLMonitor <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL,
      subject: `[변경 감지] ${name}`,
      html: `<p><b>${name}</b> 페이지가 변경되었습니다.</p><p>${summary}</p><p><a href="${url}">${url}</a></p>`,
    }).catch(() => {})
  }
}
