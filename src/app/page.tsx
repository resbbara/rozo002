'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity } from 'lucide-react'
import type { MonitoredUrl } from '@/types'
import AddUrlForm from '@/components/AddUrlForm'
import UrlCard from '@/components/UrlCard'
import PushToggle from '@/components/PushToggle'

export default function Home() {
  const [urls, setUrls] = useState<MonitoredUrl[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/urls')
    setUrls(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/urls/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    })
    load()
  }

  const active = urls.filter(u => u.is_active).length
  const changed = urls.filter(u => u.last_hash !== null).length

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={22} color="var(--accent)" />
          <span style={{ fontWeight: 800, fontSize: 20 }}>URL Monitor</span>
        </div>
        <PushToggle />
      </div>

      {/* 요약 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: '등록된 URL', value: urls.length, color: 'var(--text)' },
          { label: '모니터링 중', value: active, color: 'var(--success)' },
          { label: '첫 확인 완료', value: changed, color: 'var(--accent)' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* URL 추가 폼 */}
      <AddUrlForm onAdded={load} />

      {/* URL 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>로딩 중...</div>
      ) : urls.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 60, border: '1px dashed var(--border)', borderRadius: 12 }}>
          <Activity size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>등록된 URL이 없습니다.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>위 버튼으로 URL을 추가해보세요.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {urls.map(item => (
            <UrlCard key={item.id} item={item} onDeleted={load} onToggle={toggle} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Vercel Cron이 설정된 주기마다 자동 확인합니다 · 변경 감지 시 브라우저 알림 + 이메일 발송
      </p>
    </div>
  )
}
