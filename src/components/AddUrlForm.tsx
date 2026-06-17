'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { parseEmails } from '@/lib/validate'

interface Props {
  onAdded: () => void
}

export default function AddUrlForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    url: '',
    name: '',
    selector: '',
    interval_minutes: 60,
    extra_emails: '',
    min_change_percent: 0,
    keywords: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 이메일 검증
    const { valid: emails, invalid } = parseEmails(form.extra_emails)
    if (invalid.length > 0) {
      setError(`잘못된 이메일 형식: ${invalid.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url,
          name: form.name,
          selector: form.selector || null,
          interval_minutes: form.interval_minutes,
          extra_emails: emails,
          min_change_percent: Number(form.min_change_percent) || 0,
          keywords: form.keywords.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setForm({ url: '', name: '', selector: '', interval_minutes: 60, extra_emails: '', min_change_percent: 0, keywords: '' })
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가 실패')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 6,
    padding: '8px 12px',
    width: '100%',
    fontSize: 14,
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
      >
        <Plus size={16} /> URL 추가
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>새 URL 등록</span>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>이름 *</label>
          <input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예) 네이버 메인" required />
        </div>
        <div>
          <label style={labelStyle}>체크 주기 (분)</label>
          <input style={fieldStyle} type="number" min={1} value={form.interval_minutes} onChange={e => setForm(f => ({ ...f, interval_minutes: Number(e.target.value) }))} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>URL *</label>
        <input style={fieldStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" required type="url" />
      </div>

      <div>
        <label style={labelStyle}>CSS 셀렉터 (선택 — 비워두면 전체 페이지)</label>
        <input style={fieldStyle} value={form.selector} onChange={e => setForm(f => ({ ...f, selector: e.target.value }))} placeholder="예) .price, #stock-info, h1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>변경 민감도 (%)</label>
          <input style={fieldStyle} type="number" min={0} max={100} value={form.min_change_percent} onChange={e => setForm(f => ({ ...f, min_change_percent: Number(e.target.value) }))} />
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>0 = 모든 변경 알림</p>
        </div>
        <div>
          <label style={labelStyle}>키워드 감지 (선택, 쉼표 구분)</label>
          <input style={fieldStyle} value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="예) 재고있음, 마감, 품절" />
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>입력 시 해당 단어 등장/사라짐에만 알림</p>
        </div>
      </div>

      <div>
        <label style={labelStyle}>이 URL 전용 이메일 (선택, 쉼표 구분)</label>
        <input style={fieldStyle} value={form.extra_emails} onChange={e => setForm(f => ({ ...f, extra_emails: e.target.value }))} placeholder="a@example.com, b@example.com" />
      </div>

      {error && (
        <div style={{ background: '#ef444422', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>취소</button>
        <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  )
}
