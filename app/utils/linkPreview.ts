const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i

export function youtubeEmbedUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  let id: string | null = null

  if (host === 'youtu.be') {
    id = parsed.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v')
    } else {
      const [kind, value] = parsed.pathname.split('/').filter(Boolean)
      if (kind === 'embed' || kind === 'shorts' || kind === 'live') {
        id = value ?? null
      }
    }
  }

  if (!id || !/^[\w-]{11}$/.test(id)) {
    return null
  }

  return `https://www.youtube-nocookie.com/embed/${id}`
}

export function directImageUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }
  return IMAGE_EXTENSION.test(parsed.pathname) ? url : null
}

export function instantLinkPreview(url: string): string | null {
  return directImageUrl(url)
}
