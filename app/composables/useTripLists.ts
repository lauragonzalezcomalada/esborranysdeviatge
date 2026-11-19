import type { Database } from "~/types/database.types"

export type TripListItem = Database["public"]["Tables"]["list_items"]["Row"]
export type TripList = Database["public"]["Tables"]["lists"]["Row"] & {
  list_items: TripListItem[]
}

export function useTripLists() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function loadLists(tripId: string) {
    const { data, error } = await supabase
      .from("lists")
      .select("*, list_items(*)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .order("created_at", { ascending: true, foreignTable: "list_items" })

    if (error) throw error
    return (data ?? []) as TripList[]
  }

  async function insertList(input: { tripId: string, name: string, description: string }) {
    const { data, error } = await supabase
      .from("lists")
      .insert({
        trip_id: input.tripId,
        name: input.name.trim(),
        description: input.description.trim() || null
      })
      .select("*, list_items(*)")
      .single()

    if (error) throw error
    return data as TripList
  }

  async function insertItem(input: { listId: string, name: string }) {
    const { data, error } = await supabase
      .from("list_items")
      .insert({
        list_id: input.listId,
        name: input.name.trim()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function updateItemSelected(id: string, selected: boolean) {
    const { error } = await supabase
      .from("list_items")
      .update({ selected })
      .eq("id", id)

    if (error) throw error
  }

  async function deleteList(id: string) {
    const { error } = await supabase.from("lists").delete().eq("id", id)
    if (error) throw error
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("list_items").delete().eq("id", id)
    if (error) throw error
  }

  return {
    user,
    loadLists,
    insertList,
    insertItem,
    updateItemSelected,
    deleteList,
    deleteItem
  }
}
