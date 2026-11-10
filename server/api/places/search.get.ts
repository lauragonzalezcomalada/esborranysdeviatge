type PhotonFeature = {
  geometry: {
    coordinates: [number, number]
  }
  properties: {
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
  }
}

type PhotonResponse = {
  features?: PhotonFeature[]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event).q
  const q = typeof query === 'string' ? query.trim() : ''
  if (q.length < 2) {
    return { features: [] }
  }

  const data = await $fetch<PhotonResponse>('https://photon.komoot.io/api/', {
    query: {
      q,
      limit: 5,
      lang: 'default'
    }
  })

  return {
    features: (data.features ?? []).map(feature => ({
      geometry: {
        coordinates: feature.geometry.coordinates
      },
      properties: {
        osm_id: feature.properties.osm_id,
        name: feature.properties.name,
        street: feature.properties.street,
        housenumber: feature.properties.housenumber,
        city: feature.properties.city,
        state: feature.properties.state,
        country: feature.properties.country
      }
    }))
  }
})
