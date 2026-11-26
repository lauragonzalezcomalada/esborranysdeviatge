<script setup lang="ts">
import type { CollectionNode } from '~/components/CollectionCard.vue'
import type { TripCollection } from '~/composables/useTripCollections'
import type { TripResource } from '~/composables/useTripResources'

definePageMeta({
  layout: 'trip'
})

const UNASSIGNED = 'unassigned'

const tripId = useRoute().params.slug
const { t } = useI18n()

const { loadTripResources, insertResource, deleteResource, updateResource } = useTripResources()
const { loadCollections, insertCollection, updateCollection, deleteCollection } =
  useTripCollections()

const resources = ref<TripResource[]>([])
const collections = ref<TripCollection[]>([])
const collapsed = ref<Record<string, boolean>>({})
const loadError = ref('')

const groupCardBgs = ['var(--group-card-bg-1)', 'var(--group-card-bg-2)']

const search = ref('')
const addCollectionModalOpen = ref(false)
const collectionParentId = ref<string | null>(null)
const collectionTitle = ref('')
const collectionDescription = ref('')
const addResourceModalOpen = ref(false)
const resourceCollectionId = ref<string | null>(null)
const resourceName = ref('')
const resourceDescription = ref('')
const resourceLink = ref('')
const resourceFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const saveError = ref('')

const editCollectionModalOpen = ref(false)
const editCollectionId = ref('')
const editCollectionTitle = ref('')
const editCollectionDescription = ref('')
const editResourceModalOpen = ref(false)
const editResourceId = ref('')
const editResourceName = ref('')
const editResourceDescription = ref('')
const editResourceLink = ref('')
const editResourceCollectionId = ref(UNASSIGNED)

onMounted(async () => {
  try {
    const [loadedCollections, loadedResources] = await Promise.all([
      loadCollections(tripId as string),
      loadTripResources({ tripId: tripId as string })
    ])
    collections.value = loadedCollections
    resources.value = loadedResources
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : t('errors.saveCollection')
    loadError.value = message
  }
})

function toggleCollection(id: string) {
  collapsed.value = {
    ...collapsed.value,
    [id]: !collapsed.value[id]
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  resourceFile.value = input.files?.[0] ?? null
}

function openAddResource(collectionId: string | null) {
  resourceCollectionId.value = collectionId
  saveError.value = ''
  addResourceModalOpen.value = true
}

function openAddCollection(parentId: string | null) {
  collectionParentId.value = parentId
  saveError.value = ''
  addCollectionModalOpen.value = true
}

async function saveCollection() {
  saving.value = true
  saveError.value = ''
  try {
    const created = await insertCollection({
      tripId: tripId as string,
      title: collectionTitle.value,
      description: collectionDescription.value,
      parentId: collectionParentId.value
    })
    collections.value.push(created)
    addCollectionModalOpen.value = false
    collectionParentId.value = null
    collectionTitle.value = ''
    collectionDescription.value = ''
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : t('errors.saveCollection')
  } finally {
    saving.value = false
  }
}

async function saveResource() {
  saving.value = true
  saveError.value = ''
  try {
    const newResource = await insertResource({
      tripId: tripId as string,
      name: resourceName.value,
      description: resourceDescription.value,
      link: resourceLink.value,
      file: resourceFile.value,
      collectionId: resourceCollectionId.value
    })
    resources.value.push(newResource)
    addResourceModalOpen.value = false
    resourceName.value = ''
    resourceDescription.value = ''
    resourceLink.value = ''
    resourceFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : t('errors.saveResource')
  } finally {
    saving.value = false
  }
}
function collectionResources(collectionId: string) {
  return resources.value.filter((resource) => resource.collection_id === collectionId)
}

function buildNode(
  collection: TripCollection,
  childrenByParent: Map<string | null, TripCollection[]>,
  visiting: Set<string>
): CollectionNode | null {
  if (visiting.has(collection.id)) return null
  visiting.add(collection.id)
  const children = (childrenByParent.get(collection.id) ?? [])
    .map((child) => buildNode(child, childrenByParent, visiting))
    .filter((child): child is CollectionNode => child !== null)
  visiting.delete(collection.id)
  return {
    id: collection.id,
    title: collection.title,
    description: collection.description,
    resources: collectionResources(collection.id),
    children
  }
}

const collectionTree = computed(() => {
  const childrenByParent = new Map<string | null, TripCollection[]>()
  const ids = new Set(collections.value.map((collection) => collection.id))
  for (const collection of collections.value) {
    const parentId =
      collection.parent_id && ids.has(collection.parent_id) ? collection.parent_id : null
    const siblings = childrenByParent.get(parentId) ?? []
    siblings.push(collection)
    childrenByParent.set(parentId, siblings)
  }
  return (childrenByParent.get(null) ?? [])
    .map((collection) => buildNode(collection, childrenByParent, new Set()))
    .filter((collection): collection is CollectionNode => collection !== null)
})

function filterNode(node: CollectionNode, query: string): CollectionNode | null {
  const collectionMatches =
    node.title.toLowerCase().includes(query) ||
    (node.description ?? '').toLowerCase().includes(query)
  if (collectionMatches) return node
  const resources = node.resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(query) ||
      resource.description.toLowerCase().includes(query)
  )
  const children = node.children
    .map((child) => filterNode(child, query))
    .filter((child): child is CollectionNode => child !== null)
  if (!resources.length && !children.length) return null
  return { ...node, resources, children }
}

function flattenCollections(
  nodes: CollectionNode[],
  depth = 0
): { label: string; value: string }[] {
  return nodes.flatMap((node) => [
    { label: `${'· '.repeat(depth)}${node.title}`, value: node.id },
    ...flattenCollections(node.children, depth + 1)
  ])
}

const collectionOptions = computed(() => [
  { label: t('resources.unassigned'), value: UNASSIGNED },
  ...flattenCollections(collectionTree.value)
])

const visibleCollections = computed(() => {
  const query = search.value.trim().toLowerCase()
  const groups = query
    ? collectionTree.value
        .map((collection) => filterNode(collection, query))
        .filter((collection): collection is CollectionNode => collection !== null)
    : collectionTree.value
  const unassigned = resources.value.filter((resource) => !resource.collection_id)
  if (!unassigned.length) return groups
  const unassignedMatches = query
    ? unassigned.filter(
        (resource) =>
          resource.name.toLowerCase().includes(query) ||
          resource.description.toLowerCase().includes(query)
      )
    : unassigned
  if (!unassignedMatches.length) return groups
  return [
    ...groups,
    {
      id: UNASSIGNED,
      title: t('resources.unassigned'),
      description: null,
      resources: unassignedMatches,
      children: []
    }
  ]
})

function openEditCollection(collectionId: string) {
  const collection = collections.value.find((item) => item.id === collectionId) ?? null
  if (!collection) return
  editCollectionId.value = collection.id
  editCollectionTitle.value = collection.title
  editCollectionDescription.value = collection.description ?? ''
  saveError.value = ''
  editCollectionModalOpen.value = true
}

function descendantIds(collectionId: string) {
  const ids = new Set<string>([collectionId])
  let grew = true
  while (grew) {
    grew = false
    for (const collection of collections.value) {
      if (collection.parent_id && ids.has(collection.parent_id) && !ids.has(collection.id)) {
        ids.add(collection.id)
        grew = true
      }
    }
  }
  return ids
}

async function removeCollection(collectionId: string) {
  if (!confirm(t('resources.confirmDeleteCollection'))) return
  await deleteCollection(collectionId)
  const removed = descendantIds(collectionId)
  collections.value = collections.value.filter((collection) => !removed.has(collection.id))
  resources.value = resources.value.map((resource) =>
    resource.collection_id && removed.has(resource.collection_id)
      ? { ...resource, collection_id: null }
      : resource
  )
}

async function saveEditedCollection() {
  saving.value = true
  saveError.value = ''
  try {
    const updated = await updateCollection(editCollectionId.value, {
      title: editCollectionTitle.value,
      description: editCollectionDescription.value
    })
    collections.value = collections.value.map((collection) =>
      collection.id === updated.id ? updated : collection
    )
    editCollectionModalOpen.value = false
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : t('errors.saveCollection')
  } finally {
    saving.value = false
  }
}

function openEditResourceModal(resourceId: string) {
  const resource = resources.value.find((resource) => resource.id === resourceId) ?? null
  if (resource) {
    editResourceId.value = resource.id
    editResourceName.value = resource.name
    editResourceDescription.value = resource.description ?? ''
    editResourceLink.value = resource.link ?? ''
    editResourceCollectionId.value = resource.collection_id ?? UNASSIGNED
  }
  editResourceModalOpen.value = true
}

const closeEditResourceModal = () => {
  editResourceModalOpen.value = false
  editResourceName.value = ''
  editResourceDescription.value = ''
  editResourceLink.value = ''
  editResourceCollectionId.value = UNASSIGNED
}

const removeResource = async (resourceId: string) => {
  if (!confirm(t('resources.confirmDeleteResource'))) return
  await deleteResource(resourceId)
  resources.value = resources.value.filter((resource) => resource.id !== resourceId)
}

async function saveEditedResource() {
  const updatedResource = await updateResource(editResourceId.value, {
    name: editResourceName.value,
    description: editResourceDescription.value,
    link: editResourceLink.value,
    collectionId:
      editResourceCollectionId.value === UNASSIGNED ? null : editResourceCollectionId.value
  })
  if (updatedResource) {
    resources.value = resources.value.map((resource) =>
      resource.id === updatedResource.id ? updatedResource : resource
    )
    closeEditResourceModal()
  }
}
</script>

<template>
  <main
    class="min-h-screen w-full overflow-hidden bg-(--app-bg) flex flex-col py-2 md:py-4 px-4 md:px-8 pb-15 md:pb-5"
  >
    <div class="relative mt-4 flex flex-col w-full items-center justify-center gap-3 md:mt-30">
      <div class="flex gap-2 w-full justify-end">
        <UInput
          v-model="search"
          :placeholder="t('resources.search')"
          icon="i-heroicons-magnifying-glass"
          variant="ghost"
          size="lg"
          class="w-full max-w-md"
          :ui="{
            base: 'rounded-full border-2 border-(--ui-bg-elevated) py-2 ps-11 pe-4 text-(--ui-bg-elevated) placeholder:text-(--ui-bg-elevated)/90 ring-0 focus-visible:ring-2 focus-visible:ring-(--ui-text)/30 focus-visible:bg-(--ui-text)/80 hover:bg-(--ui-text)/80',
            leadingIcon: 'size-5 text-(--ui-bg-elevated)/90'
          }"
        />
        <UModal
          :title="
            collectionParentId ? t('resources.newSubcollection') : t('resources.newCollection')
          "
          :ui="{
            title: 'text-(--ui-text-contrast) tracking-tight',
            content: ' bg-(--ui-text)',
            close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
          }"
          :open="addCollectionModalOpen"
          @update:open="addCollectionModalOpen = $event"
        >
          <UButton
            icon="i-heroicons-plus"
            :label="t('resources.newCollection')"
            color="neutral"
            variant="subtle"
            class="w-fit rounded-full"
            :ui="{ leadingIcon: 'size-3 md:size-4' }"
            @click="openAddCollection(null)"
          >
            <span class="hidden md:inline">{{ t('resources.newCollection') }}</span>
            <span class="inline md:hidden">{{ t('resources.shortCollection') }}</span>
          </UButton>

          <template #body>
            <UForm id="add-collection-form" class="flex flex-col gap-3" :on-submit="saveCollection">
              <UFormField
                :label="t('common.name')"
                :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
              >
                <UInput
                  v-model="collectionTitle"
                  :placeholder="t('resources.namePlaceholder')"
                  required
                  :ui="{
                    base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                  }"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                :label="t('common.description')"
                :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
              >
                <UTextarea
                  v-model="collectionDescription"
                  :rows="2"
                  class="w-full"
                  :placeholder="t('resources.descriptionPlaceholder')"
                  :ui="{
                    base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                  }"
                />
              </UFormField>
              <p v-if="saveError" class="text-sm text-red-200">
                {{ saveError }}
              </p>
            </UForm>
          </template>
          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton
                type="submit"
                form="add-collection-form"
                class="rounded-full"
                :loading="saving"
              >
                {{ t('common.save') }}
              </UButton>
            </div>
          </template>
        </UModal>
      </div>

      <p v-if="loadError" role="alert" class="w-full text-sm text-red-200">
        {{ loadError }}
      </p>

      <div class="w-full columns-1 gap-3 sm:columns-2 lg:columns-3">
        <CollectionCard
          v-for="(collection, index) in visibleCollections"
          :key="collection.id"
          :collection="collection"
          :collapsed="collapsed"
          :searching="Boolean(search.trim())"
          :surface="groupCardBgs[index % groupCardBgs.length] ?? ''"
          ink="var(--resource-card-text)"
          @toggle="toggleCollection"
          @add-resource="openAddResource"
          @add-subcollection="openAddCollection"
          @edit-collection="openEditCollection"
          @delete-collection="removeCollection"
          @edit-resource="openEditResourceModal"
          @delete-resource="removeResource"
        />
      </div>
    </div>

    <UModal
      :title="t('resources.editCollection')"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"
      :open="editCollectionModalOpen"
      :dismissible="!saving"
      :close="!saving"
      @update:open="editCollectionModalOpen = $event"
    >
      <template #body>
        <UForm
          id="edit-collection-form"
          class="flex flex-col gap-3"
          :on-submit="saveEditedCollection"
        >
          <UFormField
            :label="t('common.name')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editCollectionTitle"
              :placeholder="t('resources.namePlaceholder')"
              required
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.description')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea
              v-model="editCollectionDescription"
              :rows="2"
              class="w-full"
              :placeholder="t('resources.descriptionPlaceholder')"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
            />
          </UFormField>
          <p v-if="saveError" class="text-sm text-red-200">
            {{ saveError }}
          </p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton type="submit" form="edit-collection-form" class="rounded-full" :loading="saving">
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :title="t('resources.new')"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: ' bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"
      :open="addResourceModalOpen"
      @update:open="addResourceModalOpen = $event"
    >
      <template #body>
        <UForm id="add-place-form" class="flex flex-col gap-3" :on-submit="saveResource">
          <UFormField
            :label="t('common.name')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="resourceName"
              :placeholder="t('resources.namePlaceholder')"
              required
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.description')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea
              v-model="resourceDescription"
              :rows="2"
              class="w-full"
              :placeholder="t('resources.descriptionPlaceholder')"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
            />
          </UFormField>
          <UFormField
            :label="t('common.link')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="resourceLink"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
            />
          </UFormField>
          <UFormField
            :label="t('common.file')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <div class="flex items-center gap-3">
              <input ref="fileInput" type="file" class="sr-only" @change="onFileChange" />
              <UButton
                type="button"
                color="neutral"
                variant="soft"
                class="rounded-full"
                @click="fileInput?.click()"
              >
                {{ t('common.chooseFile') }}
              </UButton>
              <span class="truncate text-sm text-(--ui-text-contrast)/80">
                {{ resourceFile?.name || t('common.noFile') }}
              </span>
            </div>
          </UFormField>
          <p v-if="saveError" class="text-sm text-red-200">
            {{ saveError }}
          </p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton type="submit" form="add-place-form" class="rounded-full" :loading="saving">
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :title="t('resources.edit')"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"
      :open="editResourceModalOpen"
      @update:open="editResourceModalOpen = $event"
    >
      <template #body>
        <UForm id="edit-resource-form" class="flex flex-col gap-3" @submit="saveEditedResource()">
          <UFormField
            :label="t('common.name')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editResourceName"
              :placeholder="t('resources.namePlaceholder')"
              required
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.description')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UTextarea v-model="editResourceDescription" :rows="2" class="w-full" />
          </UFormField>
          <UFormField
            :label="t('common.link')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editResourceLink"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
              }"
            />
          </UFormField>
          <UFormField
            :label="t('resources.collection')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <USelect
              v-model="editResourceCollectionId"
              :items="collectionOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton @click="closeEditResourceModal">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit" form="edit-resource-form">
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>
