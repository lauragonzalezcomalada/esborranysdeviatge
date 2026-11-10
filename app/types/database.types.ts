export type TripRow = {
  id: string
  created_at: string
  name: string
  description: string | null
  start_date: string | null
  public: boolean
  owner_id: string
}

export type PlaceRow = {
  id: string
  created_at: string
  name: string
  description: string | null
  days: number | null
  trip_id: string
  order_weight: number
  longitude: number | null
  latitude: number | null
}

export type Database = {
  public: {
    Tables: {
      trips: {
        Row: TripRow
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          start_date?: string | null
          public?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      places: {
        Row: PlaceRow
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          days?: number | null
          trip_id: string
          order_weight?: number
          longitude?: number | null
          latitude?: number | null
        }
        Update: {
          name?: string
          description?: string | null
          days?: number | null
          trip_id?: string
          order_weight?: number
          longitude?: number | null
          latitude?: number | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_trip_places: {
        Args: { p_trip_id: string }
        Returns: PlaceRow[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
