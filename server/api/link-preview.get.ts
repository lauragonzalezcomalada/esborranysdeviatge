const META_IMAGE = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>|<meta[^>]+content=["'][^"']+["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function metaContent(tag: string) {
  const content = /content=["']([^"']+)["']/i.exec(tag)?.[1]?.trim()
  return content ? decodeHtml(content) : null
}

function resolveImage(image: string, pageUrl: string) {
  try {
    const resolved = new URL(image, pageUrl)
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.toString()
    }
  } catch {
    return null
  }
  return null
}

async function readPreviewHtml(url: string, redirectsLeft: number): Promise<{ html: string, finalUrl: string } | { image: string } | null> {
  const target = await assertPublicHttpUrl(url)
  const response = await fetch(target, {
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
    headers: {
      accept: 'text/html,application/xhtml+xml,image/*;q=0.8',
      'user-agent': 'borradoresdeviaje-link-preview'
    }
  })

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (!location || redirectsLeft <= 0) {
      return null
    }
    return readPreviewHtml(new URL(location, target).toString(), redirectsLeft - 1)
  }

  if (!response.ok) {
    return null
  }

  const type = response.headers.get('content-type') ?? ''
  if (type.startsWith('image/')) {
    return { image: target.toString() }
  }
  if (!type.includes('html') && !type.includes('xml')) {
    return null
  }

  const reader = response.body?.getReader()
  if (!reader) {
    return null
  }

  const decoder = new TextDecoder()
  let html = ''
  let bytes = 0
  while (bytes < 250_000) {
    const chunk = await reader.read()
    if (chunk.done) break
    bytes += chunk.value.byteLength
    html += decoder.decode(chunk.value, { stream: true })
    if (html.includes('</head>') && /(?:og:image|twitter:image)/i.test(html)) {
      break
    }
  }
  await reader.cancel().catch(() => undefined)
  return { html, finalUrl: target.toString() }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event).url
  const raw = typeof query === 'string' ? query.trim() : ''
  if (!raw) {
    return { image: null }
  }

  try {
    const preview = await readPreviewHtml(raw, 3)
    if (!preview) {
      return { image: null }
    }
    if ('image' in preview) {
      return preview
    }

    META_IMAGE.lastIndex = 0
    for (const tag of preview.html.match(META_IMAGE) ?? []) {
      const content = metaContent(tag)
      const image = content ? resolveImage(content, preview.finalUrl) : null
      if (image) {
        return { image }
      }
    }
  } catch {
    return { image: null }
  }

  return { image: null }
})
