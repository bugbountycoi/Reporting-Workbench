const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /authorization:\s*bearer\s+\S+/gi,
  /"access_token"\s*:\s*"[^"]+"/gi,
  /"refresh_token"\s*:\s*"[^"]+"/gi,
  /"client_secret"\s*:\s*"[^"]+"/gi,
]

export function redact(input: unknown): string {
  let text = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[REDACTED]')
  }
  return text
}

export function safeLog(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
  const redacted = args.map(redact)
  console[level](...redacted)
}
