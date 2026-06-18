'use client'

import { useState } from 'react'
import { RefreshCw, Trash2, ChevronDown, ChevronUp, ExternalLink, Clock, CheckCircle, AlertCircle, Wifi, WifiOff, Pencil, X, Check, Mail, Bell, Tag, Eye } from 'lucide-react'
import type { MonitoredUrl, CheckHistory } from '@/types'
import { parseEmails } from '@/lib/validate'

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

function initForm(item: MonitoredUrl) {
  return {
    name: item.name,
    url: item.url,
    selector: item.selector ?? '',
    interval_minutes: item.interval_minutes,
    extra_emails: (item.extra_emails ?? []).join(', '),
    min_change_percent: item.min_change_percent ?? 0,
    keywords: (item.keywords ?? []).join(', '),
  }
}

// 단어 단위 간이 diff — 추가/제거 단어 목록 반환
function wordDiff(prev: string, curr: string) {
  const pw = prev.split(/\s+/).filter(Boolean)
  const cw = curr.split(/\s+/).filter(Boolean)
  const pSet = new Set(pw)
  const cSet = new Set(cw)
  const added = [...new Set(cw.filter(w => !pSet.has(w)))]
  const removed = [...new Set(pw.filter(w => !cSet.has(w)))]
  return { added, removed }
}

export default function UrlCard({ item, onDeleted, onToggle, onUpdated, onNotifyToggle }: Props) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ hasChanged?: boolean; diffSummary?: string | null; error?: string; notified?: boolean; baseline?: boolean } | null>(null)
  const [history, setHistory] = useState<CheckHistory[] | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 편집 상태
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [form, setForm] = useState(() => initForm(item))

  // diff 상세 보기 (선택된 이력 항목 id)
  const [diffOpenId, setDiffOpenId] = useState<string | null>(null)

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
    setForm(initForm(item))
    setEditError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError(null)
  }

  async function saveEdit() {
    setEditError(null)
    const { valid: emails, invalid } = parseEmails(form.extra_emails)
    if (invalid.length > 0) {
      setEditError(`잘못된 이메일 형식: ${invalid.join(', ')}`)
      return
    }

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
          extra_emails: emails,
          min_change_percent: Number(form.min_change_percent) || 0,
          keywords: form.keywords.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
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
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>변경 민감도 (%)</label>
              <input style={fieldStyle} type="number" min={0} max={100} value={form.min_change_percent} onChange={e => setForm(f => ({ ...f, min_change_percent: Number(e.target.value) }))} />
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>0 = 모든 변경</p>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>키워드 감지 (쉼표 구분)</label>
              <input style={fieldStyle} value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="재고있음, 마감, 품절" />
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>입력 시 해당 단어 등장/사라짐에만 알림</p>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>이 URL 전용 이메일 (쉼표 또는 줄바꿈으로 구분)</label>
            <textarea
              style={{ ...fieldStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              value={form.extra_emails}
              onChange={e => setForm(f => ({ ...f, extra_emails: e.target.value }))}
              placeholder="a@example.com, b@example.com"
            />
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
              아래 &quot;대표 이메일&quot; 토글을 켜면 설정의 대표 이메일에도 함께 발송됩니다.
            </p>
          </div>
          {editError && (
            <div style={{ background: '#ef444422', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
              {editError}
            </div>
          )}
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
            {(item.min_change_percent ?? 0) > 0 && (
              <span style={{ color: 'var(--accent)' }}>민감도 {item.min_change_percent}%↑</span>
            )}
            {(item.keywords?.length ?? 0) > 0 && (
              <span title={item.keywords.join(', ')} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent)' }}>
                <Tag size={10} /> 키워드 {item.keywords.length}개
              </span>
            )}
            {(item.extra_emails?.length ?? 0) > 0 && (
              <span title={item.extra_emails.join(', ')} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent)' }}>
                <Mail size={10} /> 전용 {item.extra_emails.length}명
              </span>
            )}
            <button
              onClick={() => onNotifyToggle(item.id, 'notify_email', !item.notify_email)}
              title="설정의 대표 이메일에도 발송"
              style={{ background: 'none', border: `1px solid ${item.notify_email ? 'var(--accent)' : 'var(--border)'}`, color: item.notify_email ? 'var(--accent)' : 'var(--muted)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
              <Mail size={10} /> 대표 이메일
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
                    ? `변경 감지! ${result.diffSummary ?? ''}${result.notified === false ? ' (조건 미달로 알림 생략)' : ''}`
                    : result.baseline
                      ? '기준선 저장 완료 — 다음 확인부터 변경을 감지합니다'
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
              {history.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>이력 없음</span>}
              {history.map((h, i) => {
                const prevSnap = history[i + 1]?.content_snapshot ?? ''
                const hasSnap = h.content_snapshot != null && h.content_snapshot !== ''
                const isOpen = diffOpenId === h.id
                const diff = isOpen && h.has_changed ? wordDiff(prevSnap, h.content_snapshot ?? '') : null
                return (
                  <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 6, fontSize: 12,
                    background: h.has_changed ? '#f59e0b11' : h.error ? '#ef444411' : 'transparent',
                    border: `1px solid ${h.has_changed ? '#f59e0b33' : h.error ? '#ef444433' : 'var(--border)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.error ? 'var(--danger)' : h.has_changed ? 'var(--warning)' : 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{new Date(h.checked_at).toLocaleString('ko-KR')}</span>
                      <span style={{ flex: 1, color: h.has_changed ? 'var(--warning)' : h.error ? 'var(--danger)' : 'var(--muted)' }}>
                        {h.error ? `오류: ${h.error}` : h.has_changed ? (h.diff_summary ?? '변경됨') : '변경 없음'}
                      </span>
                      {hasSnap && (
                        <button onClick={() => setDiffOpenId(isOpen ? null : h.id)} title="이 시점 내용 보기"
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <Eye size={11} /> {isOpen ? '닫기' : '내용'}
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18 }}>
                        {/* 변경된 경우: 추가/제거 단어 */}
                        {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {diff.added.length > 0 && (
                              <div>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>+ 추가됨 ({diff.added.length})</span>
                                <div style={{ marginTop: 2, color: 'var(--success)', wordBreak: 'break-word' }}>{diff.added.slice(0, 60).join(' ')}{diff.added.length > 60 ? ' …' : ''}</div>
                              </div>
                            )}
                            {diff.removed.length > 0 && (
                              <div>
                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>− 제거됨 ({diff.removed.length})</span>
                                <div style={{ marginTop: 2, color: 'var(--danger)', wordBreak: 'break-word' }}>{diff.removed.slice(0, 60).join(' ')}{diff.removed.length > 60 ? ' …' : ''}</div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* 해당 시점 전체 내용 */}
                        <div>
                          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>이 시점의 내용 ({(h.content_snapshot ?? '').length.toLocaleString()}자)</span>
                          <pre style={{
                            marginTop: 4, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 6, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            fontFamily: 'inherit', fontSize: 11, color: 'var(--text)', lineHeight: 1.5,
                          }}>{h.content_snapshot}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
