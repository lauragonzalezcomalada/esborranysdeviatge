import type { Database } from "~/types/database.types";

export function useTripEquipment() {
  const supabase = useSupabaseClient<Database>();
  const { t } = useI18n();

  async function loadTripEquipment(tripId: string) {
    const { data } = await supabase
      .from("groups")
      .select(
        `
    *,
    categories (
      *,
      options (*)
    )
  `,
      )
      .eq("trip_id", tripId);

    return data;
  }
  async function insertGroup(input: { name: string; tripId: string }) {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", input.tripId)
      .maybeSingle();

    if (tripError) {
      console.log("tripError", tripError);
      throw tripError;
    }
    if (!trip) {
      throw new Error(t("errors.selectTrip"));
    }

    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: input.name,
        trip_id: trip.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function insertCategory(input: { name: string; groupId: string }) {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: input.name,
        group_id: Number(input.groupId),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function insertOption(input: {
    name: string;
    price: string;
    link: string;
    quantity: string;
    categoryId: string;
  }) {
    const { data, error } = await supabase
      .from("options")
      .insert({
        name: input.name,
        unit_price: Number(input.price),
        link: input.link,
        quantity: Number(input.quantity),
        category_id: Number(input.categoryId),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updateOptionSelected(input: {
    id: string;
    selected: boolean;
  }) {
    const { data, error } = await supabase
      .from("options")
      .update({ selected: input.selected as boolean })
      .eq("id", Number(input.id))
      .select();

    if (error) throw error;
    return data;
  }

  async function updateOption({
    id,
    ...changes
  }: {
    id: string;
    name: string;
    price: string;
    link: string;
    quantity: string;
    memberId: number | null;
  }) {
    const { data, error } = await supabase
      .from("options")
      .update({
        name: changes.name,
        unit_price: Number(changes.price),
        link: changes.link,
        quantity: Number(changes.quantity),
        member_id: changes.memberId,
      })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async function deleteGroup(groupId: string) {
    const { data, error } = await supabase
      .from("groups")
      .delete()
      .eq("id", Number(groupId));
    if (error) throw error;
    return data;
  }

  async function deleteOption(optionId: string) {
    const { data, error } = await supabase
      .from("options")
      .delete()
      .eq("id", Number(optionId));
    if (error) throw error;
    return data;
  }

  async function deleteCategory(categoryId: string) {
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", Number(categoryId))
      .select("id")
      .single();

    if (error) throw error;

    return data;
  }

  return {
    loadTripEquipment,
    insertGroup,
    insertCategory,
    insertOption,
    updateOptionSelected,
    updateOption,
    deleteGroup,
    deleteOption,
    deleteCategory,
  };
}
