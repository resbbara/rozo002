import * as cheerio from 'cheerio'
import crypto from 'crypto'

export interface CrawlResult {
  content: string
  hash: string
  error?: string
}

export interface DiffResult {
  hasChanged: boolean
  diffSummary: string | null
}

export async function crawlUrl(url: string, selector?: string | null): Promise<CrawlResult> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; URLMonitor/1.0)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // 스크립트/스타일 제거
  $('script, style, noscript').remove()

  let content: string
  if (selector) {
    content = $(selector).text().trim()
    if (!content) throw new Error(`셀렉터 "${selector}" 에 해당하는 요소 없음`)
  } else {
    content = $('body').text().replace(/\s+/g, ' ').trim()
  }

  const hash = crypto.createHash('sha256').update(content).digest('hex')
  return { content, hash }
}

export function computeDiff(prev: string, curr: string): DiffResult {
  if (prev === curr) return { hasChanged: false, diffSummary: null }

  const prevLines = prev.split('\n')
  const currLines = curr.split('\n')

  const added = currLines.filter(l => !prevLines.includes(l)).length
  const removed = prevLines.filter(l => !currLines.includes(l)).length

  const summary = `+${added}줄 추가, -${removed}줄 제거 (전체 ${currLines.length}줄)`
  return { hasChanged: true, diffSummary: summary }
}
