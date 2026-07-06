/** Normalize pasted LeetCode handles (URLs, @prefix, whitespace). */
export function parseLeetCodeUsername(raw: string): string {
  let s = raw.trim()
  if (!s) return ''

  if (s.startsWith('@')) s = s.slice(1).trim()

  const urlMatch = s.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i)
  if (urlMatch?.[1]) s = urlMatch[1]

  s = s.split(/[/?#&]/)[0].trim()
  return s
}

export function isValidLeetCodeUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username)
}
