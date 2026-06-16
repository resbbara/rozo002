'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Props {
  onAdded: () => void
}

export default function AddUrlForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ url: '', name: '', selector: '', interval_minutes: 60 })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setForm({ url: '', name: '', selector: '', interval_minutes: 60 })
      setOpen(false)
      onAdded()
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 6,
    padding: '8px 12px',
    width: '100%',
    fontSize: 14,
  }

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
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>이름 *</label>
          <input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예) 네이버 메인" required />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>체크 주기 (분)</label>
          <input style={fieldStyle} type="number" min={1} value={form.interval_minutes} onChange={e => setForm(f => ({ ...f, interval_minutes: Number(e.target.value) }))} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>URL *</label>
        <input style={fieldStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" required type="url" />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CSS 셀렉터 (선택 — 비워두면 전체 페이지)</label>
        <input style={fieldStyle} value={form.selector} onChange={e => setForm(f => ({ ...f, selector: e.target.value }))} placeholder="예) .price, #stock-info, h1" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>취소</button>
        <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  )
}
