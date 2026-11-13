export function useTripEquipment() {
  const supabase = useSupabaseClient<any>();

  async function loadTripEquipment(tripId: string) {
    const { data, error } = await supabase
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
      throw new Error("You need to select a valid trip before starting");
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
        group_id: input.groupId,
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
        unit_price: input.price,
        link: input.link,
        quantity: input.quantity,
        category_id: input.categoryId,
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
      .update({ selected: input.selected })
      .eq("id", input.id)
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
  }) {
    const { data, error } = await supabase
      .from("options")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async function deleteGroup(groupId: string) {
    const { data, error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);
    if (error) throw error;
    return data;
  }

  async function deleteOption(optionId: string) {
    const { data, error } = await supabase
      .from("options")
      .delete()
      .eq("id", optionId);
    if (error) throw error;
    return data;
  }

  async function deleteCategory(categoryId: string) {
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
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
