import type { Database, PlaceRow, TripRow } from "~/types/database.types";

export type Place = {
  id: string;
  name: string;
  coordinates: [number, number] | null;
  description: string;
  days?: number;
  tripId: string;
  orderWeight: number;
};

export type Trip = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  startDate: Date | null;
  public: boolean;
  ownerId: string;
  publicToken: string;
};

function generatePublicToken(length = 6): string {
  if (typeof crypto === "undefined") {
    throw new Error("crypto is not available");
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let token = "";

  while (token.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    for (const byte of bytes) {
      if (byte >= 248) continue;

      token += alphabet[byte % alphabet.length];

      if (token.length === length) break;
    }
  }

  return token as string;
}

function parseCalendarDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPlace(row: PlaceRow): Place {
  const days = Number(row.days);
  const longitude = row.longitude === null ? null : Number(row.longitude);
  const latitude = row.latitude === null ? null : Number(row.latitude);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    days: Number.isFinite(days) && days > 0 ? days : undefined,
    coordinates:
      longitude === null || latitude === null ? null : [longitude, latitude],
    tripId: row.trip_id,
    orderWeight: Number(row.order_weight) || 0,
  };
}

function toDateColumn(date: Date | null) {
  if (!date) {
    return null;
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: new Date(row.created_at ?? ""),
    startDate: parseCalendarDate(row.start_date),
    public: row.public ?? false,
    ownerId: row.owner_id,
    publicToken: row.public_token as string,
  } as Trip;
}

export function useTripPlaces() {
  const supabase = useSupabaseClient<Database>();
  const { t } = useI18n();

  async function loadPlaces(tripId: string) {
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("trip_id", tripId)
      .order("order_weight", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      throw error;
    }
    return (data ?? []).map(toPlace);
  }

  async function loadTrip(tripId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ? toTrip(data) : null;
  }

  async function loadPublicTrips() {
    console.log("loadPublicTrips");
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("public", true)
      .order("created_at", { ascending: true });

    console.log("data", data);
    if (error) {
      throw error;
    }
    return data?.map(toTrip) ?? [];
  }

  async function loadPersonalTrips() {
    console.log("loadPersonalTrips");
    const user = useSupabaseUser();
    console.log("user", user.value);
    if (!user.value) {
      throw new Error(t("errors.loginToLoadTrips"));
    }
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("owner_id", user.value.sub)
      .order("created_at", { ascending: true });

    console.log("data", data);
    if (error) {
      throw error;
    }
    return data?.map(toTrip) ?? [];
  }

  async function insertTrip(input: { name: string }) {
    const user = useSupabaseUser();
    if (!user.value) {
      throw new Error(t("errors.loginToCreateTrip"));
    }
    const { data, error } = await supabase
      .from("trips")
      .insert({
        name: input.name,
        owner_id: user.value.sub as never,
        public_token: generatePublicToken(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }
    return toTrip(data);
  }

  async function insertPlace(
    tripId: string,
    input: {
      name: string;
      description: string;
      days?: number;
      coordinates: [number, number];
      orderWeight: number;
    },
  ) {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .maybeSingle();

    if (tripError) {
      console.log("tripError", tripError);
      throw tripError;
    }
    if (!trip) {
      throw new Error(t("errors.selectTrip"));
    }

    const { data, error } = await supabase
      .from("places")
      .insert({
        trip_id: tripId,
        name: input.name,
        description: input.description,
        days: input.days ?? null,
        longitude: input.coordinates[0],
        latitude: input.coordinates[1],
        order_weight: input.orderWeight,
      })
      .select("*")
      .single();
    if (error) {
      console.log("error", error);
      throw error;
    }
    return toPlace(data);
  }

  async function updateTrip(trip: Trip) {
    const { error } = await supabase
      .from("trips")
      .update({
        name: trip.name,
        description: trip.description,
        start_date: toDateColumn(trip.startDate),
      })
      .eq("id", trip.id);
    if (error) {
      throw error;
    }
  }

  async function updatePlace(place: Place) {
    const { error } = await supabase
      .from("places")
      .update({
        name: place.name,
        description: place.description,
        days: place.days ?? null,
      })
      .eq("id", place.id);
    if (error) {
      throw error;
    }
  }

  async function saveOrder(list: Place[]) {
    const results = await Promise.all(
      list.map((place, index) =>
        supabase
          .from("places")
          .update({ order_weight: index })
          .eq("id", place.id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw failed.error;
    }
    list.forEach((place, index) => {
      place.orderWeight = index;
    });
  }

  async function deletePlace(id: string) {
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }

  async function deleteTrip(id: string) {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) {
      throw error;
    }
  }

  return {
    loadPlaces,
    loadTrip,
    insertPlace,
    updateTrip,
    updatePlace,
    saveOrder,
    loadPublicTrips,
    loadPersonalTrips,
    deletePlace,
    insertTrip,
    deleteTrip,
  };
}
