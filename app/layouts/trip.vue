<script setup lang="ts">
const route = useRoute();
const navTripId = computed(() => String(route.params.slug ?? ""));

const {
  tripId,
  trip,
  editMode,
  canBeEdited,
  editOpen,
  draftName,
  draftDescription,
  draftStart,
  pageError,
  loadedId,
  planning,
  refreshTrip,
  openEditor,
  saveTripDetails,
  removeTrip,
} = useTripShell();

watch(
  [planning, canBeEdited],
  ([isPlanning, allowed], previous) => {
    if (!allowed) {
      editMode.value = false;
      editOpen.value = false;
      return;
    }
    if (isPlanning) {
      editMode.value = true;
      return;
    }
    if (previous?.[0]) {
      editMode.value = false;
    }
  },
  { immediate: true },
);

watch(
  tripId,
  async (id) => {
    if (loadedId.value === id && trip.value) {
      return;
    }
    trip.value = null;
    editOpen.value = false;
    pageError.value = "";
    loadedId.value = "";
    if (!planning.value) {
      editMode.value = false;
    }
    if (!id) {
      return;
    }
    try {
      await refreshTrip(id);
      loadedId.value = id;
    } catch (error) {
      pageError.value =
        error instanceof Error ? error.message : "No se pudo cargar el viaje.";
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="relative flex h-dvh flex-col">
    <div class="z-30 shrink-0 md:h-0 0">
      <div
        class="flex flex-col gap-3 px-4 pt-3 pb-2 md:pointer-events-none md:fixed md:inset-x-0 md:top-0 md:block md:p-0"
      >
        <div class="pointer-events-auto md:absolute md:top-0 md:left-0 md:p-8">
          <TripHeader
            v-if="trip"
            :trip="trip"
            :edit-mode="editMode"
            @edit="openEditor"
          />
          <p
            v-if="pageError"
            class="pointer-events-auto mt-2 max-w-xs text-xs text-red-300"
          >
            {{ pageError }}
          </p>
        </div>

        <div
          class="pointer-events-auto relative mx-auto w-fit md:absolute md:top-8 md:left-1/2 md:-translate-x-1/2"
        >
          <div class="absolute top-0 right-full mr-2">
            <ColorModeSelect mobile-side="bottom" />
          </div>
          <nav
            aria-label="Navegación del viaje"
            class="flex items-center gap-4 rounded-3xl border border-(--ui-border)/10 bg-white/40 px-4 py-1.5 text-sm shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)] backdrop-blur-2xl md:gap-10 md:px-6 md:py-2 md:text-base"
          >
            <NuxtLink
              :to="`/trip/${navTripId}`"
              class="font-bold tracking-tighter hover:underline"
              exact-active-class="underline"
            >
              Itinerario
            </NuxtLink>
            <NuxtLink
              :to="`/trip/${navTripId}/planning`"
              class="font-bold tracking-tighter hover:underline"
              exact-active-class="underline"
            >
              Planificación
            </NuxtLink>
          </nav>
        </div>
      </div>
    </div>

    <div class="relative min-h-0 flex-1 overflow-y-auto">
      <slot />
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
            icon="i-lucide-trash"
            variant="link"
            class="font-bold text-(--ui-bg-elevated)"
            @click="removeTrip"
          >
            Eliminar viaje
          </UButton>
          <UButton type="submit" form="edit-trip-form">Guardar</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
