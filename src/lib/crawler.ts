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
  changePercent: number
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
  if (prev === curr) return { hasChanged: false, diffSummary: null, changePercent: 0 }

  // 단어 단위 변경률 계산 (멀티셋 기준)
  const prevWords = prev.split(/\s+/).filter(Boolean)
  const currWords = curr.split(/\s+/).filter(Boolean)

  const countMap = (words: string[]) => {
    const m = new Map<string, number>()
    for (const w of words) m.set(w, (m.get(w) ?? 0) + 1)
    return m
  }
  const pm = countMap(prevWords)
  const cm = countMap(currWords)
  const allWords = new Set([...pm.keys(), ...cm.keys()])

  let added = 0
  let removed = 0
  for (const w of allWords) {
    const diff = (cm.get(w) ?? 0) - (pm.get(w) ?? 0)
    if (diff > 0) added += diff
    else removed += -diff
  }

  const base = Math.max(prevWords.length, currWords.length, 1)
  const changePercent = Math.round(((added + removed) / base) * 100)

  const summary = `${changePercent}% 변경 (+${added}단어 / -${removed}단어, 전체 ${currWords.length}단어)`
  return { hasChanged: true, diffSummary: summary, changePercent }
}
