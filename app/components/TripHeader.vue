<script setup lang="ts">
import type { Trip } from "~/composables/useTripPlaces";

defineProps<{
  trip: Trip;
  editMode: boolean;
}>();

defineEmits<{
  edit: [];
  goToHome: [];
}>();
</script>

<template>
  <div class="pointer-events-none relative flex w-full items-start">
    <div class="pointer-events-auto flex flex-col">
      <UButton
        class="px-0 text-sm font-medium text-(--ui-bg-elevated) tracking-[0.18em] uppercase hover:font-bold hover:text-(--ui-bg-elevated) transition-all duration-300"
        variant="link"
        @click="navigateTo('/')"
      >
        Borradores de viaje
      </UButton>
      <div class="flex max-w-xl items-start gap-2 max-w-sm">
        <h1 class="text-2xl font-semibold tracking-tight md:text-4xl">
          {{ trip.name }}
        </h1>
        <UButton
          v-if="editMode"
          icon="i-lucide-pencil"
          variant="link"
          class="pointer-events-auto mt-1 cursor-pointer"
          aria-label="Editar viaje"
          @click="$emit('edit')"
        />
      </div>
      <div
        v-if="trip.description"
        class="mt-2 max-w-sm text-sm font-bold wrap-anywhere"
      >
        {{ trip.description }}
      </div>
      <div v-if="trip.startDate" class="flex items-center gap-2 mt-2 text-sm">
        <UIcon name="i-lucide-calendar" class="size-4" />
        {{ trip.startDate.toLocaleDateString("es-ES") }}
      </div>
    </div>
  </div>
</template>
