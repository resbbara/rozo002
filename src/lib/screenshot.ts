import { supabaseAdmin } from './supabase'

// 외부 캡처 서비스(thum.io, 키 불필요)로 스크린샷을 받아 Supabase Storage에 저장.
// 성공 시 공개 URL 반환, 실패 시 null.
export async function captureScreenshot(targetUrl: string, urlId: string, historyId: string): Promise<string | null> {
  try {
    // thum.io: 너비 1200, 페이지 로드 대기 포함
    const captureUrl = `https://image.thum.io/get/width/1200/noanimate/${targetUrl}`
    const res = await fetch(captureUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; URLMonitor/1.0)' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return null

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) return null // 너무 작으면 실패로 간주

    const path = `${urlId}/${historyId}.jpg`
    const { error } = await supabaseAdmin.storage
      .from('screenshots')
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) return null

    const { data } = supabaseAdmin.storage.from('screenshots').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}
