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

  await supabaseAdmin.from('check_history').insert({
    url_id: urlId,
    has_changed: hasChanged,
    content_snapshot: content || null,
    diff_summary: diff.diffSummary,
    error: crawlError ?? null,
  })

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

  if (hasChanged) {
    await sendNotifications(row.name, row.url, diff.diffSummary ?? '변경 감지됨', {
      email: row.notify_email ?? true,
      push: row.notify_push ?? true,
    })
  }

  return { hasChanged, diffSummary: diff.diffSummary, error: crawlError }
}

async function sendNotifications(
  name: string,
  url: string,
  summary: string,
  notify: { email: boolean; push: boolean },
) {
  // DB에서 설정 로드
  const [{ data: settings }, { data: emailRows }, { data: subs }] = await Promise.all([
    supabaseAdmin.from('app_settings').select('resend_api_key').eq('id', 1).single(),
    supabaseAdmin.from('notification_emails').select('email').eq('is_active', true),
    supabaseAdmin.from('push_subscriptions').select('*'),
  ])

  // 브라우저 Push
  if (notify.push && subs?.length) {
    webpush.setVapidDetails(
      'mailto:' + (process.env.NOTIFY_EMAIL ?? 'admin@example.com'),
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
    const payload = JSON.stringify({ title: `[변경] ${name}`, body: summary, url })
    await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      )
    )
  }

  // 이메일 — DB API 키 우선, 없으면 env 폴백
  if (notify.email && emailRows?.length) {
    const apiKey = settings?.resend_api_key || process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'URLMonitor <onboarding@resend.dev>',
        to: emailRows.map(e => e.email),
        subject: `[변경 감지] ${name}`,
        html: `<p><b>${name}</b> 페이지가 변경되었습니다.</p><p>${summary}</p><p><a href="${url}">${url}</a></p>`,
      }).catch(() => {})
    }
  }
}
