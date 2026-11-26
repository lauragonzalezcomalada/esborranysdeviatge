import type { Database } from '~/types/database.types'

export type TripCollection = Database['public']['Tables']['collections']['Row']

export function useTripCollections() {
  const supabase = useSupabaseClient<Database>()

  async function loadCollections(tripId: string) {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  async function insertCollection(input: {
    tripId: string
    title: string
    description: string
    parentId: string | null
  }) {
    const { data, error } = await supabase
      .from('collections')
      .insert({
        trip_id: input.tripId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        parent_id: input.parentId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function updateCollection(
    collectionId: string,
    input: { title: string, description: string }
  ) {
    const { data, error } = await supabase
      .from('collections')
      .update({
        title: input.title.trim(),
        description: input.description.trim() || null
      })
      .eq('id', collectionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function deleteCollection(collectionId: string) {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)

    if (error) throw error
  }

  return {
    loadCollections,
    insertCollection,
    updateCollection,
    deleteCollection
  }
}
