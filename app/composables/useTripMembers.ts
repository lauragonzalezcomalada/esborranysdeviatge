import type { Database } from "~/types/database.types"

export type TripMember = Database["public"]["Tables"]["members"]["Row"]

export function useTripMembers() {
  const supabase = useSupabaseClient<Database>()

  async function loadMembers(tripId: string) {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("trip_id", tripId)
      .order("name", { ascending: true })

    if (error) throw error
    return data ?? []
  }

  async function insertMember(input: { tripId: string, name: string }) {
    const { data, error } = await supabase
      .from("members")
      .insert({
        trip_id: input.tripId,
        name: input.name.trim()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function deleteMember(id: number) {
    const { error } = await supabase.from("members").delete().eq("id", id)
    if (error) throw error
  }

  return {
    loadMembers,
    insertMember,
    deleteMember
  }
}
