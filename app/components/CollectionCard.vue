<script setup lang="ts">
import type { TripResource } from '~/composables/useTripResources'

export type CollectionNode = {
  id: string
  title: string
  description: string | null
  resources: TripResource[]
  children: CollectionNode[]
}

const props = defineProps<{
  collection: CollectionNode
  collapsed: Record<string, boolean>
  searching: boolean
  surface: string
  ink: string
}>()

const emit = defineEmits<{
  toggle: [id: string]
  addResource: [collectionId: string | null]
  addSubcollection: [parentId: string]
  editCollection: [collectionId: string]
  deleteCollection: [collectionId: string]
  editResource: [resourceId: string]
  deleteResource: [resourceId: string]
}>()

const { t } = useI18n()

const folded = computed(() => !props.searching && Boolean(props.collapsed[props.collection.id]))
const isUnassigned = computed(() => props.collection.id === 'unassigned')
</script>

<template>
  <article
    class="mb-3 break-inside-avoid flex flex-col gap-2 rounded-md p-3"
    :style="{ backgroundColor: surface, color: ink }"
  >
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col text-left"
        :aria-expanded="!folded"
        @click="emit('toggle', collection.id)"
      >
        <h2 class="font-bold text-xl tracking-tighter">
          {{ collection.title }}
        </h2>
        <p v-if="collection.description" class="mt-1 text-sm opacity-80">
          {{ collection.description }}
        </p>
      </button>
      <div class="flex shrink-0 items-center gap-0.5 self-end">
        <UButton
          v-if="!isUnassigned"
          color="neutral"
          variant="solid"
          class="w-fit rounded-full text-(--ui-text-contrast) text-xs"
          :ui="{ leadingIcon: 'size-3 md:size-4' }"
          icon="i-lucide-plus"
          :label="t('resources.newSubcollection')"
          @click="emit('addSubcollection', collection.id)"
        />
        <UButton
          color="neutral"
          variant="solid"
          class="w-fit rounded-full text-(--ui-text-contrast) text-xs"
          :ui="{ leadingIcon: 'size-3 md:size-4' }"
          icon="i-lucide-plus"
          :label="t('resources.new')"
          @click="emit('addResource', isUnassigned ? null : collection.id)"
        />
        <UDropdownMenu
          v-if="!isUnassigned"
          :items="[
            {
              label: t('common.edit'),
              icon: 'i-heroicons-pencil-square',
              onSelect: () => emit('editCollection', collection.id)
            },
            {
              label: t('common.delete'),
              icon: 'i-heroicons-trash',
              color: 'error',
              onSelect: () => emit('deleteCollection', collection.id)
            }
          ]"
          :ui="{
            content: 'bg-(--ui-text) rounded-xl',
            item: 'text-(--ui-text-contrast) rounded-xl hover:bg-(--ui-text-contrast)/10',
            itemLabel: 'text-(--ui-text-contrast)'
          }"
        >
          <UButton
            icon="i-heroicons-ellipsis-horizontal"
            :aria-label="t('common.actions')"
            variant="link"
            class="w-fit rounded-full text-current hover:opacity-80"
          />
        </UDropdownMenu>
      </div>
    </div>

    <div v-if="!folded" class="flex flex-col gap-2">
      <CollectionCard
        v-for="child in collection.children"
        :key="child.id"
        :collection="child"
        :collapsed="collapsed"
        :searching="searching"
        :surface="ink"
        :ink="surface"
        @toggle="emit('toggle', $event)"
        @add-resource="emit('addResource', $event)"
        @add-subcollection="emit('addSubcollection', $event)"
        @edit-collection="emit('editCollection', $event)"
        @delete-collection="emit('deleteCollection', $event)"
        @edit-resource="emit('editResource', $event)"
        @delete-resource="emit('deleteResource', $event)"
      />

      <article
        v-for="resource in collection.resources"
        :key="resource.id"
        class="flex flex-col rounded-md bg-(--resource-card-bg) p-3 text-(--resource-card-text)"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-xl font-bold tracking-tighter">
            {{ resource.name }}
          </h2>
          <UDropdownMenu
            :items="[
              {
                label: t('common.edit'),
                icon: 'i-heroicons-pencil-square',
                onSelect: () => emit('editResource', resource.id)
              },
              {
                label: t('common.delete'),
                icon: 'i-heroicons-trash',
                color: 'error',
                onSelect: () => emit('deleteResource', resource.id)
              }
            ]"
            :ui="{
              content: 'bg-(--ui-text) rounded-xl',
              item: 'text-(--ui-text-contrast) rounded-xl hover:bg-(--ui-text-contrast)/10',
              itemLabel: 'text-(--ui-text-contrast)'
            }"
          >
            <UButton
              icon="i-heroicons-ellipsis-horizontal"
              :aria-label="t('common.actions')"
              variant="link"
              class="w-fit rounded-full text-(--ui-text) hover:text-(--ui-text-contrast)/80"
            />
          </UDropdownMenu>
        </div>

        <p v-if="resource.description" class="tracking-tight text-(--resource-card-text)/70">
          {{ resource.description }}
        </p>
        <ResourceLinkPreview v-if="resource.link" :url="resource.link" />
        <ResourceFilePreview
          v-if="resource.file_path"
          :file-path="resource.file_path"
          :name="resource.name"
        />
        <a
          v-if="resource.link"
          :href="resource.link"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 break-all text-xs text-(--resource-card-text)/70 hover:text-(--resource-card-text)/90"
          >{{ resource.link }}</a
        >
      </article>
    </div>
  </article>
</template>
