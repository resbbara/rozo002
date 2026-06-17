'use client'

import { useState } from 'react'
import { RefreshCw, Trash2, ChevronDown, ChevronUp, ExternalLink, Clock, CheckCircle, AlertCircle, Wifi, WifiOff, Pencil, X, Check, Mail, Bell } from 'lucide-react'
import type { MonitoredUrl, CheckHistory } from '@/types'

interface Props {
  item: MonitoredUrl
  onDeleted: () => void
  onToggle: (id: string, active: boolean) => void
  onUpdated: () => void
  onNotifyToggle: (id: string, field: 'notify_email' | 'notify_push', value: boolean) => void
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  width: '100%',
}

export default function UrlCard({ item, onDeleted, onToggle, onUpdated, onNotifyToggle }: Props) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ hasChanged?: boolean; diffSummary?: string | null; error?: string } | null>(null)
  const [history, setHistory] = useState<CheckHistory[] | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 편집 상태
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: item.name, url: item.url, selector: item.selector ?? '', interval_minutes: item.interval_minutes })

  async function check() {
    setChecking(true)
    setResult(null)
    try {
      const res = await fetch(`/api/check/${item.id}`, { method: 'POST' })
      setResult(await res.json())
    } finally {
      setChecking(false)
    }
  }

  async function toggleHistory() {
    if (!historyOpen && !history) {
      setLoadingHistory(true)
      const res = await fetch(`/api/history/${item.id}`)
      setHistory(await res.json())
      setLoadingHistory(false)
    }
    setHistoryOpen(v => !v)
  }

  async function deleteUrl() {
    if (!confirm(`"${item.name}" 을 삭제할까요?`)) return
    await fetch(`/api/urls/${item.id}`, { method: 'DELETE' })
    onDeleted()
  }

  function startEdit() {
    setForm({ name: item.name, url: item.url, selector: item.selector ?? '', interval_minutes: item.interval_minutes })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await fetch(`/api/urls/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          selector: form.selector || null,
          interval_minutes: Number(form.interval_minutes),
        }),
      })
      setEditing(false)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  const lastChecked = item.last_checked_at
    ? new Date(item.last_checked_at).toLocaleString('ko-KR')
    : '미확인'

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color 0.15s' }}>

      {editing ? (
        /* ── 편집 모드 ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>이름</label>
              <input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>주기 (분)</label>
              <input style={fieldStyle} type="number" min={1} value={form.interval_minutes} onChange={e => setForm(f => ({ ...f, interval_minutes: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>URL</label>
            <input style={fieldStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} type="url" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>CSS 셀렉터 (비워두면 전체 페이지)</label>
            <input style={fieldStyle} value={form.selector} onChange={e => setForm(f => ({ ...f, selector: e.target.value }))} placeholder=".price, #stock-info" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <X size={13} /> 취소
            </button>
            <button onClick={saveEdit} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
              <Check size={13} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        /* ── 보기 모드 ── */
        <>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</span>
                <span style={{ fontSize: 11, background: item.is_active ? '#16a34a22' : '#44444444', color: item.is_active ? 'var(--success)' : 'var(--muted)', padding: '2px 8px', borderRadius: 20 }}>
                  {item.is_active ? '활성' : '비활성'}
                </span>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} />{item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}
              </a>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => onToggle(item.id, !item.is_active)} title={item.is_active ? '비활성화' : '활성화'}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                {item.is_active ? <Wifi size={14} /> : <WifiOff size={14} />}
              </button>
              <button onClick={startEdit} title="수정"
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                <Pencil size={14} />
              </button>
              <button onClick={check} disabled={checking} title="지금 확인"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                <RefreshCw size={13} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
                {checking ? '확인 중' : '지금 확인'}
              </button>
              <button onClick={deleteUrl} title="삭제"
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--danger)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* 메타 정보 */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{item.interval_minutes}분마다</span>
            <span>마지막 확인: {lastChecked}</span>
            {item.selector && <span style={{ color: 'var(--accent)' }}>셀렉터: {item.selector}</span>}
            <button
              onClick={() => onNotifyToggle(item.id, 'notify_email', !item.notify_email)}
              title="이메일 알림"
              style={{ background: 'none', border: `1px solid ${item.notify_email ? 'var(--accent)' : 'var(--border)'}`, color: item.notify_email ? 'var(--accent)' : 'var(--muted)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
              <Mail size={10} /> 이메일
            </button>
            <button
              onClick={() => onNotifyToggle(item.id, 'notify_push', !item.notify_push)}
              title="Push 알림"
              style={{ background: 'none', border: `1px solid ${item.notify_push ? 'var(--accent)' : 'var(--border)'}`, color: item.notify_push ? 'var(--accent)' : 'var(--muted)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
              <Bell size={10} /> Push
            </button>
          </div>

          {/* 체크 결과 */}
          {result && (
            <div style={{
              background: result.error ? '#ef444422' : result.hasChanged ? '#f59e0b22' : '#22c55e22',
              border: `1px solid ${result.error ? 'var(--danger)' : result.hasChanged ? 'var(--warning)' : 'var(--success)'}`,
              borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              {result.error
                ? <AlertCircle size={14} color="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} />
                : result.hasChanged
                  ? <AlertCircle size={14} color="var(--warning)" style={{ marginTop: 1, flexShrink: 0 }} />
                  : <CheckCircle size={14} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} />}
              <span>
                {result.error
                  ? `오류: ${result.error}`
                  : result.hasChanged
                    ? `변경 감지! ${result.diffSummary ?? ''}`
                    : '변경 없음'}
              </span>
            </div>
          )}

          {/* 이력 토글 */}
          <button onClick={toggleHistory} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, width: 'fit-content' }}>
            {historyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {loadingHistory ? '로딩 중...' : '변경 이력'}
          </button>

          {historyOpen && history && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
              {history.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>이력 없음</span>}
              {history.map(h => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, fontSize: 12,
                  background: h.has_changed ? '#f59e0b11' : h.error ? '#ef444411' : 'transparent',
                  border: `1px solid ${h.has_changed ? '#f59e0b33' : h.error ? '#ef444433' : 'var(--border)'}`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.error ? 'var(--danger)' : h.has_changed ? 'var(--warning)' : 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{new Date(h.checked_at).toLocaleString('ko-KR')}</span>
                  <span style={{ flex: 1, color: h.has_changed ? 'var(--warning)' : h.error ? 'var(--danger)' : 'var(--muted)' }}>
                    {h.error ? `오류: ${h.error}` : h.has_changed ? (h.diff_summary ?? '변경됨') : '변경 없음'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
