export interface MonitoredUrl {
  id: string
  url: string
  name: string
  selector: string | null
  interval_minutes: number
  is_active: boolean
  last_checked_at: string | null
  last_hash: string | null
  last_content: string | null
  created_at: string
}

export interface CheckHistory {
  id: string
  url_id: string
  checked_at: string
  has_changed: boolean
  content_snapshot: string | null
  diff_summary: string | null
  error: string | null
}

export interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}
