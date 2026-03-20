export function formatRelativeDate(iso: string | null) {
  if (!iso) return 'sem data'

  const date = new Date(iso)
  const diff = Date.now() - date.getTime()

  if (diff < 60_000) return 'agora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m atrás`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: diff > 31_536_000_000 ? 'numeric' : undefined,
  })
}

export function formatDateTime(iso: string | null) {
  if (!iso) return 'sem data'

  const date = new Date(iso)
  return `${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}
