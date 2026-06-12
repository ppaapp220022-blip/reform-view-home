export function resolveWebSocketBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }

  return 'ws://localhost:8080'
}
