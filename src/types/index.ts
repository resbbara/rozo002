export interface MonitoredUrl {
  id: string
  url: string
  name: string
  selector: string | null
  interval_minutes: number
  is_active: boolean
  notify_email: boolean
  notify_push: boolean
  extra_emails: string[]
  min_change_percent: number
  keywords: string[]
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
  screenshot_url: string | null
}

export interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface AppSettings {
  resend_api_key: string | null
  updated_at: string
}

export interface NotificationEmail {
  id: string
  email: string
  is_active: boolean
  created_at: string
}
