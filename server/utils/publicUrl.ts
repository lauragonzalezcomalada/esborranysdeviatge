import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

function isPrivateIp(ip: string) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === '::1' || normalized === '0.0.0.0') {
    return true
  }
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true
  }
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIp(normalized.slice(7))
  }

  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) {
    return false
  }
  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true
  return false
}

export async function assertPublicHttpUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }
  if (url.username || url.password) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
    }
    return url
  }

  const records = await lookup(hostname, { all: true })
  if (records.length === 0 || records.some(record => isPrivateIp(record.address))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  return url
}
