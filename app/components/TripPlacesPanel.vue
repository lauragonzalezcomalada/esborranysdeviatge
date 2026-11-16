<script setup lang="ts">
import type { Place } from '~/composables/useTripPlaces'

const props = defineProps<{
  places: Place[]
  startDate: Date | null
  editing?: boolean
  collapseAll?: boolean
  focusedPlaceId?: string | null
}>()

const emit = defineEmits<{
  'focus-place': [id: string]
  'reorder': [places: Place[]]
  'edit-place': [id: string]
  'delete-place': [id: string]
}>()

const dragFrom = ref<number | null>(null)
const collapsedPlaceIds = ref(new Set<string>())
const { t, locale } = useI18n()

function formatVisitDate(date: Date) {
  const parts = new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric'
  }).formatToParts(date)
  return {
    day: parts.find(part => part.type === 'day')?.value ?? '',
    month: (
      parts.find(part => part.type === 'month')?.value ?? ''
    ).toUpperCase()
  }
}

function placeStep(place: Place) {
  const days = Number(place.days)
  if (!Number.isFinite(days) || days <= 0) {
    return 1
  }
  return days
}

const placeIndexes = computed(() => {
  let day = 1
  return props.places.map((place) => {
    const index = day
    day += placeStep(place)
    return index
  })
})

const placeDates = computed(() => {
  const start = props.startDate
  if (!start) {
    return props.places.map(() => ({ day: '', month: '' }))
  }
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  return props.places.map((place) => {
    const label = formatVisitDate(cursor)
    const next = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + placeStep(place)
    )
    cursor = next
    return label
  })
})

function isPlaceCollapsed(id: string) {
  return props.collapseAll || collapsedPlaceIds.value.has(id)
}

function togglePlaceContent(id: string) {
  if (props.collapseAll) {
    return
  }
  const next = new Set(collapsedPlaceIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  collapsedPlaceIds.value = next
}

function startPlaceDrag(index: number, event: DragEvent) {
  dragFrom.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function dropPlace(index: number) {
  const from = dragFrom.value
  dragFrom.value = null
  if (from === null || from === index) {
    return
  }
  const next = props.places.slice()
  const [moved] = next.splice(from, 1)
  if (!moved) {
    return
  }
  next.splice(index, 0, moved)
  emit('reorder', next)
}
</script>

<template>
  <section
    :aria-label="t('places.list')"
    class="relative flex min-h-0 w-full flex-1 flex-col items-stretch justify-start gap-4 overflow-hidden md:items-end"
    :class="places.length > 0 ? 'md:w-[min(26rem,42vw)]' : 'md:w-0'"
  >
    <div
      class="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto px-4 md:w-[min(26rem,42vw)] md:px-0 md:pe-4"
    >
      <div
        v-for="(place, index) in places"
        :key="place.id"
        class="flex items-start gap-1 md:gap-3 py-0.5"
        :class="dragFrom === index ? 'opacity-40' : ''"
        :draggable="editing"
        @dragstart="startPlaceDrag(index, $event)"
        @dragover.prevent
        @drop.prevent="dropPlace(index)"
        @dragend="dragFrom = null"
        @mouseenter="emit('focus-place', place.id)"
      >
        <span
          v-if="!startDate"
          class="w-2 shrink-0 pt-5 text-right text-lg font-semibold tabular-nums"
        >
          {{ placeIndexes[index] }}
        </span>
        <div
          v-else
          class="flex shrink-0 flex-col items-center justify-end rounded-xl p-1.5 md:p-2.5 text-xs md:text-sm font-medium whitespace-nowwrap bg-[var(--ui-bg-elevated)]"
        >
          <span
            class="text-md md:text-lg text-center font-bold tracking-tight leading-none"
          >{{ placeDates[index]?.day }}</span>
          <span
            class="text-xs md:text-sm text-center font-bold tracking-tight leading-none"
          >{{ placeDates[index]?.month }}</span>
        </div>
        <UCard
          class="min-w-0 flex-1 cursor-grab transition-colors active:cursor-grabbing"
          :class="
            place.id === focusedPlaceId
              ? 'bg-(--ui-bg)/80 ring-[var(--ui-border-accented)]'
              : ''
          "
        >
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div
                class="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left"
                role="button"
                tabindex="0"
                :aria-expanded="!isPlaceCollapsed(place.id)"
                @click="togglePlaceContent(place.id)"
                @keydown.enter.prevent="togglePlaceContent(place.id)"
                @keydown.space.prevent="togglePlaceContent(place.id)"
              >
                <h2 class="text-xl font-semibold tracking-tight">
                  {{ place.name }}
                </h2>
                <p
                  v-if="place.days"
                  class="text-sm"
                >
                  {{ t("common.daysCount", place.days) }}
                </p>
              </div>
              <div
                v-if="editing"
                class="flex items-center gap-2"
              >
                <UButton
                  variant="link"
                  color="success"
                  :aria-label="t('places.edit')"
                  @click="emit('edit-place', place.id)"
                >
                  <UIcon
                    name="i-lucide-pencil"
                    class="size-4 text-(--ui-text-contrast)"
                  />
                </UButton>
                <UButton
                  type="submit"
                  icon="i-lucide-trash"
                  variant="link"
                  class="text-(--ui-bg-accented)"
                  :aria-label="t('places.delete')"
                  @click="emit('delete-place', place.id)"
                />
                <!--   <UButton
                  variant="link"
                  color="error"
                  :aria-label="t('places.remove')"
                  @click="emit('remove-place', place.id)"
                >
                  <UIcon name="i-lucide-x" class="size-5" />
                </UButton> -->
              </div>
            </div>
          </template>
          <template
            v-if="!isPlaceCollapsed(place.id) && place.description"
            #default
          >
            <div>
              {{ place.description }}
            </div>
          </template>
        </UCard>
      </div>
    </div>
  </section>
</template>
