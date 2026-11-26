import type { Database } from "~/types/database.types";

export type TripResource = {
  id: string;
  name: string;
  description: string;
  link: string | null;
  trip_id: string;
  file_path: string | null;
  collection_id: string | null;
};

const RESOURCES_BUCKET = "resources";

function storageErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

export function useTripResources() {
  const supabase = useSupabaseClient<Database>();
  const user = useSupabaseUser();
  const { t } = useI18n();

  function resourceFileUrl(filePath: string | null) {
    if (!filePath) {
      return null;
    }
    const { data } = supabase.storage
      .from(RESOURCES_BUCKET)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function uploadResourceFile(tripId: string, file: File) {
    const userId = user.value?.sub;
    if (!userId) {
      throw new Error(t("errors.signInToUpload"));
    }
    const safeName =
      file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 80) || "archivo";
    const path = `${userId}/${tripId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
    if (error) {
      throw new Error(storageErrorMessage(error, t("errors.saveResource")));
    }
    return path;
  }

  async function loadTripResources(input: { tripId: string }) {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("trip_id", input.tripId);

    if (error) throw error;
    return (data ?? []).map(toTripResource);
  }

  function toTripResource(resource: {
    id: number;
    name: string;
    description: string | null;
    link: string | null;
    trip_id: string | null;
    file_path: string | null;
    collection_id: string | null;
  }): TripResource {
    return {
      id: resource.id.toString(),
      name: resource.name,
      description: resource.description ?? "",
      link: resource.link ?? null,
      trip_id: resource.trip_id ?? "",
      file_path: resource.file_path ?? null,
      collection_id: resource.collection_id ?? null,
    };
  }

  async function insertResource(input: {
    tripId: string;
    name: string;
    description: string;
    link: string;
    file: File | null;
    collectionId: string | null;
  }) {
    let filePath: string | null = null;
    if (input.file) {
      filePath = await uploadResourceFile(input.tripId, input.file);
    }

    const { data, error } = await supabase
      .from("resources")
      .insert({
        name: input.name,
        description: input.description,
        link: input.link,
        trip_id: input.tripId,
        collection_id: input.collectionId,
        ...(filePath ? { file_path: filePath } : {}),
      })
      .select()
      .single();

    if (error) {
      if (filePath) {
        await supabase.storage.from(RESOURCES_BUCKET).remove([filePath]);
      }
      throw new Error(storageErrorMessage(error, t("errors.saveResource")));
    }
    return toTripResource(data);
  }

  async function deleteResource(resourceId: string) {
    const { data: resourceData, error: resourceError } = await supabase
      .from("resources")
      .select("file_path")
      .eq("id", parseInt(resourceId))
      .single();
    if (resourceError) throw resourceError;
    if (resourceData?.file_path) {
      await supabase.storage
        .from(RESOURCES_BUCKET)
        .remove([resourceData.file_path]);
    }

    const { error: deleteError } = await supabase
      .from("resources")
      .delete()
      .eq("id", parseInt(resourceId));
    if (deleteError) throw deleteError;
  }
  async function updateResource(
    resourceId: string,
    input: {
      name: string;
      description: string;
      link: string;
      collectionId: string | null;
    },
  ) {
    const { data, error: updateError } = await supabase
      .from("resources")
      .update({
        name: input.name,
        description: input.description,
        link: input.link,
        collection_id: input.collectionId,
      })
      .eq("id", parseInt(resourceId))
      .select()
      .single();
    if (updateError) throw updateError;
    return toTripResource(data);
  }

  return {
    loadTripResources,
    insertResource,
    resourceFileUrl,
    deleteResource,
    updateResource,
  };
}
