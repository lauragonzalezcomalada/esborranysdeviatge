type HeaderBag = {
  get?: (name: string) => string | null | undefined
  [key: string]: unknown
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const request = (event as { req?: { headers?: HeaderBag } }).req
    const headers = request?.headers
    if (!headers || typeof headers.get === 'function') {
      return
    }

    headers.get = (name: string) => {
      const value = headers[name.toLowerCase()]
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      if (typeof value === 'string') {
        return value
      }
      return null
    }
  })
})
