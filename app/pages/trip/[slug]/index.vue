<script setup lang="ts">
import type { Place } from "~/composables/useTripPlaces";

definePageMeta({
  layout: "trip",
});

const { t } = useI18n();

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

useAppColorMode();
const { loadPlaces, insertPlace, updatePlace, deletePlace, saveOrder } =
  useTripPlaces();
const { trip, tripId, editMode, canBeEdited } = useTripShell();

const places = ref<Place[]>([]);
const focusedPlaceId = ref<string | null>(null);
const collapseAll = ref(false);
const pageError = ref("");
const mobilePane = ref<"globe" | "places">("globe");

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

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchGeneration = 0;

const preview = computed<[number, number] | null>(
  () => selectedLocation.value?.coordinates ?? null,
);

const canSavePlace = computed(
  () => placeName.value.trim().length > 0 && selectedLocation.value !== null,
);

const supabaseConfig = useRuntimeConfig().public.supabase as
  | { url?: string; key?: string }
  | undefined;

watch(
  tripId,
  async (id) => {
    places.value = [];
    focusedPlaceId.value = null;
    addPlaceOpen.value = false;
    editPlaceOpen.value = false;
    pageError.value = "";
    if (!id) {
      return;
    }
    if (!supabaseConfig?.url || !supabaseConfig.key) {
      pageError.value =
        t("errors.missingSupabase");
      return;
    }
    try {
      places.value = await loadPlaces(id);
    } catch (error) {
      pageError.value =
        error instanceof Error ? error.message : t("errors.loadTrip");
    }
  },
  { immediate: true },
);

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

  if (!canBeEdited.value) {
    return;
  }
  try {
    if (!confirm(t("places.confirmDelete"))) {
      return;
    }
    await deletePlace(id);

    places.value = places.value.filter((place) => place.id !== id);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : t("errors.deletePlace");
  } finally {
    editPlaceOpen.value = false;
  }
}

async function savePlaceOrder(next: Place[]) {
  if (!canBeEdited.value) {
    return;
  }
  const weights = next.map((place) => place.orderWeight).sort((a, b) => a - b);
  next.forEach((place, index) => {
    place.orderWeight = weights[index] ?? index;
  });
  places.value = [...places.value].sort(
    (a, b) => a.orderWeight - b.orderWeight,
  );

  try {
    await saveOrder(places.value);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : t("errors.saveOrder");
  }
}

function placeLabel(feature: PhotonFeature) {
  const { name, street, housenumber, city, state, country } =
    feature.properties;
  const title =
    name || [street, housenumber].filter(Boolean).join(" ") || city || t("places.fallbackName");
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
      pageError.value = t("errors.selectTrip");
    }
    return;
  }
  if (!canBeEdited.value) {
    return;
  }
  const days = Number(placeDays.value);
  try {
    const newPlace = await insertPlace(tripId.value, {
      name,
      description: placeDescription.value.trim(),
      days: Number.isFinite(days) && days > 0 ? days : undefined,
      coordinates: location.coordinates,
      orderWeight: places.value.length,
    });
    places.value.push(newPlace);
    addPlaceOpen.value = false;
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : t("errors.savePlace");
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
  if (!place || !name || !canBeEdited.value) {
    return;
  }
  place.name = name;
  place.description = editDescription.value.trim();
  const days = Number(editDays.value);
  place.days = Number.isFinite(days) && days > 0 ? days : undefined;
  editPlaceOpen.value = false;
  editingPlace.value = null;
  try {
    await updatePlace(place);
    pageError.value = "";
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : t("errors.savePlace");
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
</script>

<template>
  <main class="relative h-full min-h-0 overflow-hidden bg-[var(--app-bg)]">
    <div
      v-if="tripId"
      class="flex h-full min-h-0 flex-col md:absolute md:inset-0 md:flex-row"
    >
      <div class="flex shrink-0 justify-center gap-2 px-4 py-2 md:hidden">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tracking-tight"
          :class="
            mobilePane === 'globe'
              ? 'bg-(--ui-text) text-(--ui-text-contrast)'
              : 'bg-white/40'
          "
          :aria-pressed="mobilePane === 'globe'"
          @click="mobilePane = 'globe'"
        >
          <UIcon name="i-lucide-globe" class="size-4" />
          {{ t("places.globe") }}
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tracking-tight"
          :class="
            mobilePane === 'places'
              ? 'bg-(--ui-text) text-(--ui-text-contrast)'
              : 'bg-white/40'
          "
          :aria-pressed="mobilePane === 'places'"
          @click="mobilePane = 'places'"
        >
          <UIcon name="i-lucide-map-pin" class="size-4" />
          {{ t("places.places") }}
        </button>
      </div>

      <div
        class="relative min-h-0 min-w-0 flex-1"
        :class="mobilePane !== 'globe' && 'max-md:hidden'"
      >
        <GlobeMap
          :places="places"
          :focused-place-id="focusedPlaceId"
          :preview="preview"
          @focus-place="focusedPlaceId = $event"
        />
      </div>

      <div
        class="flex min-h-0 flex-col overflow-hidden max-md:flex-1 md:h-full md:shrink-0 md:pt-24"
        :class="mobilePane !== 'places' && 'max-md:hidden'"
      >
        <div
          class="flex w-full shrink-0 flex-col items-end gap-2 px-4 py-2 md:px-0 md:pe-4"
        >
          <div class="flex items-center gap-2">
            <div
              v-if="canBeEdited"
              class="w-fit rounded-full bg-(--ui-bg-elevated)/70 px-2 md:px-4 py-1 md:py-2 shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)] backdrop-blur-2xl"
            >
              <USwitch
                v-model="editMode"
                :label="t('places.editMode')"
                :ui="{ label: 'tracking-tight' }"
              />
            </div>
            <div
              class="w-fit rounded-full bg-(--ui-bg-elevated)/70 px-2 md:px-4 py-1 md:py-2 shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)] backdrop-blur-2xl"
            >
              <USwitch
                v-model="collapseAll"
                :label="t('places.collapseAll')"
                :ui="{ label: 'tracking-tight' }"
              />
            </div>
          </div>
          <p v-if="pageError" class="max-w-xs text-right text-xs text-red-300">
            {{ pageError }}
          </p>
          <UModal
            v-if="editMode"
            v-model:open="addPlaceOpen"
            :title="t('places.add')"
            class="mb-2"
            :ui="{
              title: 'text-(--ui-text-contrast) tracking-tight',
              content: 'bg-(--ui-text)',
              close:
                'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
            }"
          >
            <UButton
              icon="i-lucide-plus"
              class="rounded-full px-4 py-2 text-md tracking-tight text-(--ui-bg-elevated) hover:text-background/80"
            >
              {{ t("places.add") }}
            </UButton>
            <template #body>
              <UForm
                id="add-place-form"
                class="flex flex-col gap-3"
                :on-submit="savePlace"
              >
                <UFormField
                  :label="t('places.search')"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="searchQuery"
                    :placeholder="t('places.searchPlaceholder')"
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
                    {{ t("places.searching") }}
                  </p>
                  <p
                    v-else-if="searchStatus === 'error'"
                    class="text-xs text-red-300"
                  >
                    {{ t("places.searchError") }}
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
                    {{ t("places.noResults") }}
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
                  :label="t('common.name')"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="placeName"
                    :placeholder="t('places.namePlaceholder')"
                    required
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  :label="t('common.description')"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UTextarea
                    v-model="placeDescription"
                    :placeholder="t('places.descriptionPlaceholder')"
                    :rows="3"
                    class="w-full"
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                    }"
                  />
                </UFormField>
                <UFormField
                  :label="t('common.days')"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="placeDays"
                    :placeholder="t('common.days')"
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
                  class="font-bold text-(--ui-bg-elevated)"
                  @click="addPlaceOpen = false"
                >
                  {{ t("common.cancel") }}
                </UButton>
                <UButton
                  type="submit"
                  form="add-place-form"
                  :disabled="!canSavePlace"
                >
                  {{ t("common.save") }}
                </UButton>
              </div>
            </template>
          </UModal>
        </div>

        <TripPlacesPanel
          class="self-end"
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
    </div>

    <div
      v-else
      class="flex h-full items-center justify-center px-6 text-center"
    >
      <div class="max-w-md">
        <p class="text-lg text-amber-200">
          {{ t("trip.missing") }}
        </p>
        <NuxtLink
          :to="$localePath('/')"
          class="mt-6 inline-block text-sm text-white/70 underline"
        >
          {{ t("trip.back") }}
        </NuxtLink>
      </div>
    </div>

    <UModal
      v-model:open="editPlaceOpen"
      :title="editingPlace ? t('places.editing', { name: editingPlace.name }) : t('places.edit')"
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
            :label="t('common.name')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editName"
              :placeholder="t('places.namePlaceholder')"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.description')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea
              v-model="editDescription"
              :placeholder="t('places.descriptionPlaceholder')"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) text-(--ui-text-contrast)',
              }"
              :rows="3"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.days')"
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
            >{{ t("common.save") }}</UButton
          >
        </div>
      </template>
    </UModal>
  </main>
</template>
