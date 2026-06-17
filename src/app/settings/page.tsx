'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Mail, Key, Plus, Trash2, Send, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { NotificationEmail } from '@/types'

const field: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  width: '100%',
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

export default function SettingsPage() {
  const [emails, setEmails] = useState<NotificationEmail[]>([])
  const [resendKey, setResendKey] = useState('')
  const [resendKeyMasked, setResendKeyMasked] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingEmail, setAddingEmail] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, string> | null>(null)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/settings')
    const { settings, emails: e } = await res.json()
    setEmails(e ?? [])
    if (settings?.resend_api_key) {
      setResendKey(settings.resend_api_key)
      setResendKeyMasked(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveApiKey() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resend_api_key: resendKey }),
    })
    setSaving(false)
    setResendKeyMasked(true)
    showToast('API 키 저장 완료')
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault()
    setAddingEmail(true)
    const res = await fetch('/api/settings/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    })
    if (res.ok) {
      setNewEmail('')
      load()
      showToast('이메일 추가 완료')
    } else {
      const { error } = await res.json()
      showToast(`오류: ${error}`)
    }
    setAddingEmail(false)
  }

  async function toggleEmail(id: string, is_active: boolean) {
    await fetch(`/api/settings/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    load()
  }

  async function deleteEmail(id: string) {
    await fetch(`/api/settings/emails/${id}`, { method: 'DELETE' })
    load()
  }

  async function testNotify(type: 'email' | 'push' | 'all') {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/settings/test-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    setTestResult(await res.json())
    setTesting(false)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <span style={{ fontWeight: 800, fontSize: 18 }}>알림 설정</span>
      </div>

      {/* Resend API 키 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700 }}>Resend API 키</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -8 }}>
          이메일 알림 발송에 사용됩니다. resend.com에서 무료로 발급 가능합니다.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={field}
            type={resendKeyMasked ? 'password' : 'text'}
            value={resendKey}
            onChange={e => { setResendKey(e.target.value); setResendKeyMasked(false) }}
            placeholder="re_xxxxxxxxxxxxxxxxxxxx"
          />
          <button
            onClick={saveApiKey}
            disabled={saving || !resendKey}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 이메일 수신자 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700 }}>대표 이메일 수신자</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -8 }}>
          여기 등록된 이메일은 각 URL에서 &quot;대표 이메일&quot; 토글이 켜진 경우 공통으로 발송됩니다.
          특정 URL에만 보내려면 URL 카드의 수정에서 &quot;전용 이메일&quot;을 입력하세요.
        </p>

        {/* 추가 폼 */}
        <form onSubmit={addEmail} style={{ display: 'flex', gap: 8 }}>
          <input
            style={field}
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="example@gmail.com"
            required
          />
          <button
            type="submit"
            disabled={addingEmail}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            <Plus size={14} /> 추가
          </button>
        </form>

        {/* 이메일 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emails.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>등록된 이메일이 없습니다.</p>
          )}
          {emails.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.is_active ? 'var(--success)' : 'var(--muted)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14 }}>{e.email}</span>
              <button
                onClick={() => toggleEmail(e.id, !e.is_active)}
                style={{ background: 'none', border: '1px solid var(--border)', color: e.is_active ? 'var(--success)' : 'var(--muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                {e.is_active ? '활성' : '비활성'}
              </button>
              <button
                onClick={() => deleteEmail(e.id)}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 테스트 발송 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700 }}>알림 테스트</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -8 }}>
          실제 알림이 정상 동작하는지 확인합니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['email', 'push', 'all'] as const).map(type => (
            <button
              key={type}
              onClick={() => testNotify(type)}
              disabled={testing}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              {testing ? '발송 중...' : type === 'email' ? '이메일 테스트' : type === 'push' ? 'Push 테스트' : '전체 테스트'}
            </button>
          ))}
        </div>
        {testResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(testResult).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 12px', background: v.includes('완료') ? '#22c55e11' : '#ef444411', border: `1px solid ${v.includes('완료') ? '#22c55e33' : '#ef444433'}`, borderRadius: 8 }}>
                {v.includes('완료') ? <Check size={13} color="var(--success)" /> : <AlertCircle size={13} color="var(--danger)" />}
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{k}</span>
                <span style={{ color: 'var(--muted)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontSize: 14, boxShadow: '0 4px 24px #0008', zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
