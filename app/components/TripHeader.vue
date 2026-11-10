<script setup lang="ts">
import type { Trip } from "~/composables/useTripPlaces";

defineProps<{
  trip: Trip;
  editingPlaces: boolean;
}>();

defineEmits<{
  edit: [];
  goToHome: [];
}>();
</script>

<template>
  <div class="flex flex-col">
    <div class="flex max-w-xl items-start gap-2">
      <h1 class="text-3xl font-semibold sm:text-4xl tracking-tight">
        {{ trip.name }}
      </h1>
      <UButton
        v-if="!editingPlaces"
        icon="i-lucide-pencil"
        variant="link"
        class="pointer-events-auto mt-1 cursor-pointer"
        aria-label="Editar viaje"
        @click="$emit('edit')"
      />
    </div>
    <p v-if="trip.description" class="mt-2 max-w-xl text-sm font-bold">
      {{ trip.description }}
    </p>
    <div v-if="trip.startDate" class="flex items-center gap-2 mt-2 text-sm">
      <UIcon name="i-lucide-calendar" class="size-4" />
      {{ trip.startDate.toLocaleDateString("es-ES") }}
    </div>
  </div>
</template>
