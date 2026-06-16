'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

export default function PushToggle() {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  async function toggle() {
    setLoading(true)
    try {
      if (!subscribed) {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        })
        const json = sub.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
        })
        setSubscribed(true)
      } else {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const sub = await reg?.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button onClick={toggle} disabled={loading}
      style={{ background: subscribed ? '#16a34a22' : 'none', border: `1px solid ${subscribed ? 'var(--success)' : 'var(--border)'}`, color: subscribed ? 'var(--success)' : 'var(--muted)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      {subscribed ? <Bell size={14} /> : <BellOff size={14} />}
      {loading ? '처리 중...' : subscribed ? '알림 ON' : '알림 OFF'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
