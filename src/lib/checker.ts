import { supabaseAdmin } from './supabase'
import { crawlUrl, computeDiff } from './crawler'
import { captureScreenshot } from './screenshot'
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

  const isBaseline = !crawlError && row.last_hash === null  // 최초 체크 (비교 대상 없음)
  const hasChanged = !crawlError && row.last_hash !== null && hash !== row.last_hash
  const diff = hasChanged ? computeDiff(row.last_content ?? '', content) : { hasChanged: false, diffSummary: null, changePercent: 0 }

  // 알림 발송 여부 판정 (민감도 + 키워드)
  let shouldNotify = hasChanged
  let skipReason = ''

  if (hasChanged) {
    const minPercent = row.min_change_percent ?? 0
    if (minPercent > 0 && diff.changePercent < minPercent) {
      shouldNotify = false
      skipReason = `민감도 미달 (${diff.changePercent}% < ${minPercent}%)`
    }

    const keywords: string[] = row.keywords ?? []
    if (shouldNotify && keywords.length > 0) {
      const prevText = (row.last_content ?? '').toLowerCase()
      const currText = content.toLowerCase()
      const triggered = keywords.filter(k => {
        const kw = k.trim().toLowerCase()
        if (!kw) return false
        return prevText.includes(kw) !== currText.includes(kw) // 등장 또는 사라짐
      })
      if (triggered.length === 0) {
        shouldNotify = false
        skipReason = '키워드 변화 없음'
      } else {
        skipReason = `키워드 변화: ${triggered.join(', ')}`
      }
    }
  }

  const diffSummaryForHistory = hasChanged && skipReason && !shouldNotify
    ? `${diff.diffSummary} · 알림 생략(${skipReason})`
    : diff.diffSummary

  const { data: histRow } = await supabaseAdmin.from('check_history').insert({
    url_id: urlId,
    has_changed: hasChanged,
    content_snapshot: content || null,
    diff_summary: diffSummaryForHistory,
    error: crawlError ?? null,
  }).select('id').single()

  // 기준선 또는 변경 시점에 화면 스크린샷 캡처·저장
  if (!crawlError && histRow && (isBaseline || hasChanged)) {
    const shotUrl = await captureScreenshot(row.url, urlId, histRow.id)
    if (shotUrl) {
      await supabaseAdmin.from('check_history').update({ screenshot_url: shotUrl }).eq('id', histRow.id)
    }
  }

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

  if (shouldNotify) {
    await sendNotifications(row.name, row.url, diff.diffSummary ?? '변경 감지됨', {
      useGlobalEmail: row.notify_email ?? true,
      extraEmails: row.extra_emails ?? [],
      push: row.notify_push ?? true,
    })
  }

  return { hasChanged, diffSummary: diffSummaryForHistory, error: crawlError, notified: shouldNotify, baseline: isBaseline }
}

async function sendNotifications(
  name: string,
  url: string,
  summary: string,
  notify: { useGlobalEmail: boolean; extraEmails: string[]; push: boolean },
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

  // 수신 이메일 = (대표 이메일 ON이면 글로벌 active 목록) ∪ (URL 전용 이메일), 중복 제거
  const recipients = new Set<string>()
  if (notify.useGlobalEmail) {
    for (const e of emailRows ?? []) recipients.add(e.email.trim().toLowerCase())
  }
  for (const e of notify.extraEmails) {
    const v = e.trim().toLowerCase()
    if (v) recipients.add(v)
  }

  // 이메일 — DB API 키 우선, 없으면 env 폴백
  if (recipients.size > 0) {
    const apiKey = settings?.resend_api_key || process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'URLMonitor <onboarding@resend.dev>',
        to: [...recipients],
        subject: `[변경 감지] ${name}`,
        html: `<p><b>${name}</b> 페이지가 변경되었습니다.</p><p>${summary}</p><p><a href="${url}">${url}</a></p>`,
      }).catch(() => {})
    }
  }
}
