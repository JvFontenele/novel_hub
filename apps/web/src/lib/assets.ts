export function resolveCoverImageUrl(coverUrl: string | null | undefined): string | null {
  if (!coverUrl) {
    return null
  }

  const params = new URLSearchParams({ url: coverUrl })
  return `/api/v1/assets/cover?${params.toString()}`
}
