const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

// 쉼표/줄바꿈으로 구분된 문자열을 파싱하고 유효 이메일만 반환.
// 잘못된 항목이 있으면 invalid 배열에 담아 반환.
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const items = raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []
  for (const item of items) {
    if (isValidEmail(item)) valid.push(item)
    else invalid.push(item)
  }
  return { valid, invalid }
}
