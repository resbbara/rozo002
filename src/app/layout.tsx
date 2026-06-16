import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'URL Monitor',
  description: 'URL 변경 감지 모니터링',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
