export function formatRelativeTime(isoDate: string): string {
  const diffSeconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)

  if (diffSeconds < 60) return 'agora mesmo'
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `há ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `há ${diffDays}d`
}
