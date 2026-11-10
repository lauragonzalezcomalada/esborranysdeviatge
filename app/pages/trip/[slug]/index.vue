<script setup lang="ts">
import type { Place, Trip } from "~/composables/useTripPlaces";
import UColorModeSelect from "~/components/ColorModeSelect.vue";

type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type PhotonResponse = {
  features: PhotonFeature[];
};

type DraftLocation = {
  label: string;
  coordinates: [number, number];
};

const route = useRoute();
useAppColorMode();
const {
  loadTrip,
  updateTrip,
  loadPlaces,
  insertPlace,
  updatePlace,
  deletePlace,
  saveOrder,
  deleteTrip,
} = useTripPlaces();

const trip = ref<Trip | null>(null);
const places = ref<Place[]>([]);
const focusedPlaceId = ref<string | null>(null);
const editMode = ref(false);
const collapseAll = ref(false);
const pageError = ref("");

const editOpen = ref(false);
const draftName = ref("");
const draftDescription = ref("");
const draftStart = ref("");

const addPlaceOpen = ref(false);
const placeName = ref("");
const placeDescription = ref("");
const placeDays = ref(0);
const searchQuery = ref("");
const searchResults = ref<PhotonFeature[]>([]);
const searchStatus = ref<"idle" | "loading" | "error">("idle");
const settledQuery = ref("");
const selectedLocation = ref<DraftLocation | null>(null);

const editPlaceOpen = ref(false);
const editingPlace = ref<Place | null>(null);
const editName = ref("");
const editDescription = ref("");
const editDays = ref<number>();

const publicUsage = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchGeneration = 0;

const tripId = computed(() => {
  const slug = route.params.slug;
  const value = Array.isArray(slug) ? slug[0] : slug;
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : "";
});

const preview = computed<[number, number] | null>(
  () => selectedLocation.value?.coordinates ?? null,
);

const canSavePlace = computed(
  () => placeName.value.trim().length > 0 && selectedLocation.value !== null,
);

const supabaseConfig = useRuntimeConfig().public.supabase as
  | { url?: string; key?: string }
  | undefined;

function dateFromInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
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

function dateToInput(date: Date | null) {
  if (!date) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

watch(
  tripId,
  async (id) => {
    trip.value = null;
    places.value = [];
    focusedPlaceId.value = null;
    editMode.value = false;
    editOpen.value = false;
    addPlaceOpen.value = false;
    editPlaceOpen.value = false;
    publicUsage.value = false;
    pageError.value = "";
    if (!id) {
      return;
    }
    if (!supabaseConfig?.url || !supabaseConfig.key) {
      pageError.value =
        "Añade NUXT_PUBLIC_SUPABASE_URL y NUXT_PUBLIC_SUPABASE_KEY en .env.";
      return;
    }
    try {
      const [loadedTrip, loadedPlaces] = await Promise.all([
        loadTrip(id),
        loadPlaces(id),
      ]);
      trip.value = loadedTrip;
      places.value = loadedPlaces;
      console.log("loadedTrip", loadedTrip);
      console.log("loadedTrip.public", loadedTrip?.public);
      publicUsage.value = loadedTrip?.public === true;
    } catch (error) {
      pageError.value =
        error instanceof Error ? error.message : "No se pudo cargar el viaje.";
    }
  },
  { immediate: true },
);

watch(editOpen, (open) => {
  if (!open || !trip.value) {
    return;
  }
  draftName.value = trip.value.name;
  draftDescription.value = trip.value.description;
  draftStart.value = dateToInput(trip.value.startDate);
});

watch(editMode, (on) => {
  if (on) {
    return;
  }
  addPlaceOpen.value = false;
  editPlaceOpen.value = false;
});

async function deleteEditedPlace(id: string) {
  if (!id) {
    return;
  }

  try {
    // Don't persist if public trip
    if (!publicUsage.value) {
      if (!confirm("¿Estás seguro de querer eliminar este lugar?")) {
        return;
      }
      await deletePlace(id);
    }

    places.value = places.value.filter((place) => place.id !== id);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "No se pudo eliminar el lugar.";
  } finally {
    editPlaceOpen.value = false;
  }
}

async function saveTripDetails() {
  const current = trip.value;
  const name = draftName.value.trim();
  if (!current || !name) {
    return;
  }
  current.name = name;
  current.description = draftDescription.value.trim();
  current.startDate = dateFromInput(draftStart.value);
  editOpen.value = false;

  // Don't persist if public trip
  if (publicUsage.value) {
    return;
  }
  try {
    await updateTrip(current);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "No se pudo guardar el viaje.";
  }
}

async function savePlaceOrder(next: Place[]) {
  if (publicUsage.value) {
    return;
  }
  const weights = next.map((place) => place.orderWeight).sort((a, b) => a - b);
  next.forEach((place, index) => {
    place.orderWeight = weights[index] ?? index;
  });
  places.value = [...places.value].sort(
    (a, b) => a.orderWeight - b.orderWeight,
  );

  // Don't persist if public trip
  if (publicUsage.value) {
    return;
  }

  try {
    await saveOrder(places.value);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "No se pudo guardar el orden.";
  }
}

function placeLabel(feature: PhotonFeature) {
  const { name, street, housenumber, city, state, country } =
    feature.properties;
  const title =
    name || [street, housenumber].filter(Boolean).join(" ") || city || "Lugar";
  const detail = [city, state, country].filter(
    (part) => part && part !== title,
  );
  return [title, ...detail].join(", ");
}

function resultKey(feature: PhotonFeature, index: number) {
  return `${feature.properties.osm_id ?? "lugar"}-${index}`;
}

async function searchPlaces(query: string) {
  const generation = ++searchGeneration;
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed === selectedLocation.value?.label) {
    searchResults.value = [];
    searchStatus.value = "idle";
    settledQuery.value = "";
    return;
  }
  searchStatus.value = "loading";
  try {
    const data = await $fetch<PhotonResponse>("/api/places/search", {
      query: { q: trimmed },
    });
    if (generation !== searchGeneration) {
      return;
    }
    searchResults.value = data.features ?? [];
    searchStatus.value = "idle";
    settledQuery.value = trimmed;
  } catch {
    if (generation !== searchGeneration) {
      return;
    }
    searchResults.value = [];
    searchStatus.value = "error";
    settledQuery.value = trimmed;
  }
}

watch(searchQuery, (query) => {
  if (selectedLocation.value && query.trim() !== selectedLocation.value.label) {
    selectedLocation.value = null;
  }
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchPlaces(query);
  }, 300);
});

function chooseResult(feature: PhotonFeature) {
  const [lng, lat] = feature.geometry.coordinates;
  const label = placeLabel(feature);
  selectedLocation.value = { label, coordinates: [lng, lat] };
  searchResults.value = [];
  searchQuery.value = label;
  if (!placeName.value.trim()) {
    placeName.value = feature.properties.name || label;
  }
}

function resetPlaceDraft() {
  placeName.value = "";
  placeDescription.value = "";
  placeDays.value = 0;
  searchQuery.value = "";
  searchResults.value = [];
  searchStatus.value = "idle";
  settledQuery.value = "";
  selectedLocation.value = null;
  clearTimeout(searchTimer);
  searchGeneration += 1;
}

watch(addPlaceOpen, (open) => {
  if (!open) {
    resetPlaceDraft();
  }
});

async function savePlace() {
  const location = selectedLocation.value;
  const name = placeName.value.trim();
  if (!tripId.value || !location || !name) {
    if (!tripId.value) {
      pageError.value = "You need to select a valid trip before starting";
    }
    return;
  }
  const days = Number(placeDays.value);
  try {
    let placeToAdd = {
      name,
      description: placeDescription.value.trim(),
      days: Number.isFinite(days) && days > 0 ? days : undefined,
      coordinates: location.coordinates,
      orderWeight: places.value.length,
    };
    //Don't persist if public trip
    if (!publicUsage.value) {
      const newPlace = await insertPlace(tripId.value, {
        name: placeToAdd.name,
        description: placeToAdd.description,
        days: placeToAdd.days,
        coordinates: placeToAdd.coordinates,
        orderWeight: placeToAdd.orderWeight,
      });
      placeToAdd = {
        ...newPlace,
        days: placeToAdd.days,
        coordinates: placeToAdd.coordinates,
        orderWeight: placeToAdd.orderWeight,
      };
    }
    places.value.push({
      ...placeToAdd,
      id: "00000000-0000-0000-0000-000000000000",
      tripId: tripId.value,
    });
    addPlaceOpen.value = false;
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "No se pudo guardar el lugar.";
  }
}

function openPlaceEditor(id: string) {
  const place = places.value.find((item) => item.id === id) ?? null;
  editingPlace.value = place;
  if (!place) {
    return;
  }
  editName.value = place.name;
  editDescription.value = place.description;
  editDays.value = place.days;
  editPlaceOpen.value = true;
}

async function saveEditedPlace() {
  const place = editingPlace.value;
  const name = editName.value.trim();
  if (!place || !name) {
    return;
  }
  place.name = name;
  place.description = editDescription.value.trim();
  const days = Number(editDays.value);
  place.days = Number.isFinite(days) && days > 0 ? days : undefined;
  editPlaceOpen.value = false;
  editingPlace.value = null;
  // Don't persist if public trip
  if (publicUsage.value) {
    return;
  }
  try {
    await updatePlace(place);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : "No se pudo guardar el lugar.";
  }
}

function unfocusOutsideGlobe(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target.closest(".maplibregl-map")) {
    return;
  }
  focusedPlaceId.value = null;
}

onMounted(() => {
  window.addEventListener("click", unfocusOutsideGlobe);
});

onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  window.removeEventListener("click", unfocusOutsideGlobe);
});

async function removeTrip() {
  if (!confirm("¿Estás seguro de querer eliminar este viaje?")) {
    return;
  }
  if (!trip.value) {
    return;
  }
  await deleteTrip(trip.value.id);
  navigateTo("/");
}
</script>

<template>
  <main class="relative h-dvh w-full overflow-hidden bg-[var(--app-bg)]">
    <div v-if="tripId" class="absolute inset-0 flex">
      <div class="relative min-w-0 flex-1">
        <GlobeMap
          :places="places"
          :focused-place-id="focusedPlaceId"
          :preview="preview"
          @focus-place="focusedPlaceId = $event"
        />

        <div class="relative z-10 flex flex-col p-8 h-[95vh] max-w-sm">
          <UButton
            class="px-0 text-sm font-medium text-(--ui-bg-elevated) tracking-[0.18em] uppercase hover:font-bold hover:text-(--ui-bg-elevated) transition-all duration-300"
            variant="link"
            @click="navigateTo('/')"
          >
            Borradores de viaje
          </UButton>
          <TripHeader
            v-if="trip"
            :trip="trip"
            @edit="editOpen = true"
            :editingPlaces="!editMode"
          />
          <div
            class="flex flex-col gap-2 mt-8 bg-(--ui-bg-elevated)/70 w-fit rounded-lg p-4"
          >
            <USwitch v-model="editMode" label="Edit mode" />
            <USwitch v-model="collapseAll" label="Collapse all" />
            <UButton
              variant="solid"
              icon="i-heroicons-cog-6-tooth"
              class="w-fit text-(--ui-text-contrast) bg-(--ui-text) font-bold"
              @click="navigateTo(`/trip/${tripId}/planning`)"
            >
              Planificación
            </UButton>

            <p v-if="pageError" class="max-w-xs text-xs text-red-300">
              {{ pageError }}
            </p>
          </div>
          <div class="flex-grow" />
          <UColorModeSelect class="w-fit" />
        </div>

        <div
          v-if="editMode"
          class="pointer-events-none fixed top-10 right-10 z-40 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col items-end gap-3"
        >
          <UModal
            v-model:open="addPlaceOpen"
            title="Añadir lugar"
            :overlay="false"
            :portal="false"
            :ui="{
              title: 'text-(--ui-bg-elevated) tracking-tight',
              content:
                'pointer-events-auto relative inset-auto w-full max-w-none translate-none max-h-[calc(100dvh-5.5rem)] overflow-hidden bg-(--ui-text)',
              close: 'text-(--ui-bg-elevated) hover:bg-(--ui-text-contrast)/10',
            }"
          >
            <UButton
              icon="i-lucide-plus"
              class="pointer-events-auto rounded-full hover:text-background/80 text-(--ui-bg-elevated)"
            >
              Añadir lugar
            </UButton>
            <template #body>
              <UForm
                id="add-place-form"
                class="flex flex-col gap-3"
                :on-submit="savePlace"
              >
                <UFormField
                  label="Buscar lugar"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="searchQuery"
                    placeholder="Ciudad, dirección o sitio"
                    autocomplete="off"
                    class="w-full"
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                  />
                </UFormField>
                <div class="flex flex-col gap-1 text-sm text-white/70">
                  <p
                    v-if="searchStatus === 'loading'"
                    class="text-xs text-(--ui-text-contrast)"
                  >
                    Buscando…
                  </p>
                  <p
                    v-else-if="searchStatus === 'error'"
                    class="text-xs text-red-300"
                  >
                    No se pudo buscar. Inténtalo de nuevo.
                  </p>
                  <p
                    v-else-if="
                      searchQuery.trim().length >= 2 &&
                      settledQuery === searchQuery.trim() &&
                      searchResults.length === 0 &&
                      !selectedLocation
                    "
                    class="text-xs text-(--ui-text-contrast)"
                  >
                    Sin resultados
                  </p>
                  <ul
                    v-if="searchResults.length"
                    class="max-h-48 overflow-y-auto rounded-md border border-white/10 bg-slate-900 py-1 shadow-lg"
                  >
                    <li
                      v-for="(result, index) in searchResults"
                      :key="resultKey(result, index)"
                    >
                      <button
                        type="button"
                        class="w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                        @click="chooseResult(result)"
                      >
                        {{ placeLabel(result) }}
                      </button>
                    </li>
                  </ul>
                </div>
                <UFormField
                  label="Nombre"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="placeName"
                    placeholder="Nombre del lugar"
                    required
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Descripción"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UTextarea
                    v-model="placeDescription"
                    placeholder="Una nota sobre este lugar"
                    :rows="3"
                    class="w-full"
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                  />
                </UFormField>
                <UFormField
                  label="Días"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="placeDays"
                    placeholder="Días"
                    class="w-full"
                    type="number"
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                  />
                </UFormField>
              </UForm>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton
                  type="button"
                  variant="link"
                  class="text-(--ui-bg-elevated) font-bold"
                  @click="addPlaceOpen = false"
                >
                  Cancelar
                </UButton>
                <UButton
                  type="submit"
                  form="add-place-form"
                  :disabled="!canSavePlace"
                >
                  Guardar
                </UButton>
              </div>
            </template>
          </UModal>
        </div>
      </div>

      <TripPlacesPanel
        :places="places"
        :start-date="trip?.startDate ?? null"
        :editing="editMode"
        :collapse-all="collapseAll"
        :focused-place-id="focusedPlaceId"
        @focus-place="focusedPlaceId = $event"
        @reorder="savePlaceOrder"
        @edit-place="openPlaceEditor"
        @delete-place="deleteEditedPlace"
      />
    </div>

    <div
      v-else
      class="flex h-full items-center justify-center px-6 text-center"
    >
      <div class="max-w-md">
        <p class="text-lg text-amber-200">
          You need to select a valid trip before starting
        </p>
        <NuxtLink
          to="/"
          class="mt-6 inline-block text-sm text-white/70 underline"
        >
          Back to trips
        </NuxtLink>
      </div>
    </div>

    <UModal
      v-model:open="editOpen"
      title="Editar viaje"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: ' bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
      }"
    >
      <template #body>
        <UForm
          id="edit-trip-form"
          class="flex flex-col gap-3"
          :on-submit="saveTripDetails"
        >
          <UFormField
            label="Nombre"
            required
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="draftName"
              required
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
            />
          </UFormField>
          <UFormField
            label="Descripción"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea
              v-model="draftDescription"
              :rows="3"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
            />
          </UFormField>
          <UFormField
            label="Inicio"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="draftStart"
              type="date"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-4">
          <UButton
            @click="removeTrip"
            icon="i-lucide-trash"
            variant="link"
            class="text-(--ui-bg-elevated) font-bold"
            >Eliminar viaje</UButton
          >

          <UButton type="submit" form="edit-trip-form">Guardar</UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="editPlaceOpen"
      :title="editingPlace ? `Editando: ${editingPlace.name}` : 'Editar lugar'"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: ' bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
      }"
    >
      <template #body>
        <UForm
          v-if="editingPlace"
          id="edit-place-form"
          class="flex flex-col gap-3"
          :on-submit="saveEditedPlace"
        >
          <UFormField
            label="Nombre"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editName"
              placeholder="Nombre del lugar"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Descripción"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea
              v-model="editDescription"
              placeholder="Una nota sobre este lugar"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
              :rows="3"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Días"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editDays"
              type="number"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end">
          <UButton
            type="submit"
            form="edit-place-form"
            color="success"
            variant="solid"
            icon="i-lucide-check"
            >Guardar</UButton
          >
        </div>
      </template>
    </UModal>
  </main>
</template>
