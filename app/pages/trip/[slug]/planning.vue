<script setup>
import { useMediaQuery } from '@vueuse/core'

definePageMeta({
  layout: 'trip'
})

const tripId = useRoute().params.slug
const { t } = useI18n()

const { canBeEdited } = useTripShell()

const {
  loadTripEquipment,
  insertGroup,
  deleteGroup,
  insertCategory,
  insertOption,
  updateOption,
  updateOptionSelected,
  deleteOption,
  deleteCategory
} = useTripEquipment()
const { loadMembers, insertMember, deleteMember } = useTripMembers()

const resources = ref([])
const members = ref([])
const memberNameInput = ref('')
const membersModalOpen = ref(false)
const search = ref('')
const isMobile = useMediaQuery('(max-width: 767px)')

const groupName = ref('')
const categoryName = ref('')
const addGroupModalOpen = ref(false)

const selectedGroupId = ref(null)
const addCategoryModalOpen = ref(false)

const selectedCategoryId = ref(null)
const addOptionModalOpen = ref(false)

const optionName = ref('')
const optionPrice = ref('')
const optionLink = ref('')
const optionQuantity = ref(1)

function openAddGroupModal() {
  if (!canBeEdited.value) {
    return
  }
  addGroupModalOpen.value = true
}
onMounted(async () => {
  const [equipment, tripMembers] = await Promise.all([
    loadTripEquipment(tripId),
    loadMembers(tripId).catch(() => [])
  ])
  resources.value = equipment
  members.value = tripMembers
})

const memberOptions = computed(() => [
  { label: t('planning.unassigned'), value: 'unassigned' },
  ...members.value.map((member) => ({
    label: member.name,
    value: String(member.id)
  }))
])

function memberName(option) {
  if (option.member_id == null) return ''
  return (
    members.value
      .find((member) => String(member.id) === String(option.member_id))
      ?.name?.charAt(0) ?? ''
  )
}

function optionMatchesSearch(option) {
  const query = search.value.trim().toLowerCase()
  return Boolean(query) && option.name?.toLowerCase().includes(query)
}

function optionMenuItems(option, categoryId) {
  const items = []

  if (isMobile.value && option.link) {
    items.push({
      label: t('planning.itemLink'),
      icon: 'i-heroicons-link',
      onSelect: () => window.open(option.link, '_blank', 'noopener,noreferrer')
    })
  }

  if (canBeEdited.value) {
    items.push(
      {
        label: t('common.edit'),
        icon: 'i-heroicons-pencil-square',
        onSelect: () => openEditOptionModal(option, categoryId)
      },
      {
        label: t('common.delete'),
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect: () => removeOption(option.id, categoryId)
      }
    )
  }

  return items
}

function memberTotals(category) {
  const totals = new Map()

  for (const option of category.options ?? []) {
    if (!option.selected || option.member_id == null) continue
    const amount = (Number(option.quantity) || 0) * (Number(option.unit_price) || 0)
    totals.set(option.member_id, (totals.get(option.member_id) || 0) + amount)
  }

  return [...totals.entries()]
    .map(([id, total]) => ({
      id,
      name: members.value.find((member) => String(member.id) === String(id))?.name ?? '',
      total
    }))
    .filter((bubble) => bubble.name)
}

async function addMember() {
  const name = memberNameInput.value.trim()
  if (!canBeEdited.value || !name) return

  const member = await insertMember({ tripId, name })
  members.value.push(member)
  members.value.sort((a, b) => a.name.localeCompare(b.name))
  memberNameInput.value = ''
}

async function removeMember(memberId) {
  if (!canBeEdited.value) return
  await deleteMember(memberId)
  members.value = members.value.filter((member) => member.id !== memberId)
}

async function saveGroup() {
  if (!canBeEdited.value) {
    return
  }
  try {
    const group = await insertGroup({ name: groupName.value, tripId: tripId })
    resources.value.push(group)
    addGroupModalOpen.value = false
    groupName.value = ''
  } catch (error) {
    console.error(error)
  }
}

function openAddCategoryModal(groupId) {
  if (!canBeEdited.value) {
    return
  }
  selectedGroupId.value = groupId
  addCategoryModalOpen.value = true
}

async function saveCategory() {
  if (!canBeEdited.value) {
    return
  }
  try {
    const group = resources.value.find((resource) => resource.id === selectedGroupId.value)

    if (!group) throw new Error(t('planning.groupNotFound'))

    const category = await insertCategory({
      name: categoryName.value,
      groupId: group.id
    })

    group.categories ??= []
    group.categories.push({
      ...category,
      options: category.options ?? []
    })

    addCategoryModalOpen.value = false
    categoryName.value = ''
  } catch (error) {
    console.error('Error al guardar la categoría:', error)
  }
}

function openAddOptionModal(categoryId) {
  if (!canBeEdited.value) {
    return
  }
  selectedCategoryId.value = categoryId
  addOptionModalOpen.value = true
}

async function saveOption() {
  if (!canBeEdited.value) {
    return
  }
  try {
    const category = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === selectedCategoryId.value)

    if (!category) throw new Error(t('planning.categoryNotFound'))

    const option = await insertOption({
      name: optionName.value,
      price: optionPrice.value,
      link: optionLink.value,
      quantity: optionQuantity.value,
      categoryId: category.id
    })

    category.options ??= []
    category.options.push(option)

    addOptionModalOpen.value = false
    optionName.value = ''
    optionPrice.value = ''
    optionLink.value = ''
    optionQuantity.value = ''
  } catch (error) {
    console.error(error)
  }
}

async function updateOptionSelection(optionId, categoryId) {
  if (!canBeEdited.value) {
    return
  }
  const option = resources.value
    .flatMap((group) => group.categories ?? [])
    .find((category) => category.id === categoryId)
    .options.find((o) => o.id === optionId)
  option.selected = !option.selected
  try {
    await updateOptionSelected({
      id: optionId,
      selected: option.selected
    })
  } catch (error) {
    console.error(error)
  }
}

async function removeGroup(groupId) {
  if (!canBeEdited.value) {
    return
  }
  if (!confirm(t('planning.confirmDeleteGroup'))) {
    return
  }
  try {
    await deleteGroup(groupId)
    resources.value = resources.value.filter((r) => r.id !== groupId)
  } catch (error) {
    console.error(error)
  }
}

async function removeOption(optionId, categoryId) {
  if (!canBeEdited.value) {
    return
  }
  if (!confirm(t('planning.confirmDeleteOption'))) {
    return
  }
  try {
    await deleteOption(optionId)
    resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === categoryId).options = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === categoryId)
      .options.filter((o) => o.id !== optionId)
  } catch (error) {
    console.error(error)
  }
}

const editOptionModalOpen = ref(false)
const editOptionSaving = ref(false)
const editOptionError = ref('')
const editingOptionId = ref(null)
const editingCategoryId = ref(null)

const editOptionForm = reactive({
  name: '',
  price: '',
  link: '',
  quantity: '',
  memberId: ''
})

function openEditOptionModal(option, categoryId) {
  if (!canBeEdited.value) {
    return
  }
  editingOptionId.value = option.id
  editingCategoryId.value = categoryId
  editOptionError.value = ''

  Object.assign(editOptionForm, {
    name: option.name,
    price: String(option.unit_price ?? ''),
    link: option.link ?? '',
    quantity: String(option.quantity ?? ''),
    memberId: option.member_id == null ? 'unassigned' : String(option.member_id)
  })

  editOptionModalOpen.value = true
}

async function saveEditedOption() {
  if (!canBeEdited.value) {
    return
  }
  if (editOptionSaving.value) return

  editOptionError.value = ''

  const changes = {
    name: editOptionForm.name.trim(),
    unit_price: Number(editOptionForm.price),
    link: editOptionForm.link.trim(),
    quantity: Number(editOptionForm.quantity)
  }

  if (
    !changes.name ||
    editOptionForm.price === '' ||
    editOptionForm.quantity === '' ||
    !Number.isFinite(changes.unit_price) ||
    changes.unit_price < 0 ||
    !Number.isInteger(changes.quantity) ||
    changes.quantity < 1
  ) {
    editOptionError.value = 'Revisa el nombre, el precio y la cantidad.'
    return
  }

  editOptionSaving.value = true

  try {
    const category = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === editingCategoryId.value)

    const option = category?.options?.find((option) => option.id === editingOptionId.value)

    if (!option) throw new Error(t('planning.optionNotFound'))

    const selectedMember = editOptionForm.memberId
    const memberId =
      !selectedMember || selectedMember === 'unassigned' ? null : Number(selectedMember)

    if (memberId !== null && !Number.isFinite(memberId)) {
      editOptionError.value = t('planning.optionNotFound')
      editOptionSaving.value = false
      return
    }

    await updateOption({
      id: String(option.id),
      name: changes.name,
      price: editOptionForm.price,
      link: changes.link,
      quantity: String(changes.quantity),
      memberId
    })

    Object.assign(option, changes, { member_id: memberId })
    editOptionModalOpen.value = false
  } catch (error) {
    console.error(error)
    editOptionError.value =
      error && typeof error === 'object' && 'message' in error && error.message
        ? String(error.message)
        : 'No se ha podido guardar la opción.'
  } finally {
    editOptionSaving.value = false
  }
}

async function removeCategory(categoryId, groupId) {
  if (!canBeEdited.value) {
    return
  }
  if (!confirm(t('planning.confirmDeleteCategory'))) {
    return
  }
  try {
    await deleteCategory(categoryId)

    const group = resources.value.find((resource) => resource.id === groupId)

    if (group) {
      group.categories = group.categories.filter((category) => category.id !== categoryId)
    }
  } catch (error) {
    console.error('Error al eliminar la categoría:', error)
  }
}

const cardBgColors = ref([
  'bg-(--ui-primary)/70 text-(--card-text-contrast)',
  'bg-(--ui-bg)/70',
  'bg-(--app-fg)/70'
])

const groupCardBgs = ['bg-(--group-card-bg-1)', 'bg-(--group-card-bg-2)']

function selectedCost(resource) {
  return (resource.categories ?? []).reduce((subtotal, category) => {
    return (
      subtotal +
      (category.options ?? []).reduce((sum, option) => {
        return option.selected
          ? sum + (Number(option.quantity) || 0) * (Number(option.unit_price) || 0)
          : sum
      }, 0)
    )
  }, 0)
}

const tripTotal = computed(() =>
  (resources.value ?? []).reduce((total, resource) => total + selectedCost(resource), 0)
)

const filteredResources = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return resources.value ?? []

  return (resources.value ?? []).filter((group) => {
    if (group.name?.toLowerCase().includes(query)) return true
    return (group.categories ?? []).some(
      (category) =>
        category.name?.toLowerCase().includes(query) ||
        (category.options ?? []).some((option) => option.name?.toLowerCase().includes(query))
    )
  })
})

const memberTripTotals = computed(() => {
  const totals = new Map()

  for (const resource of resources.value ?? []) {
    for (const category of resource.categories ?? []) {
      for (const option of category.options ?? []) {
        if (!option.selected || option.member_id == null) continue
        const amount = (Number(option.quantity) || 0) * (Number(option.unit_price) || 0)
        totals.set(option.member_id, (totals.get(option.member_id) || 0) + amount)
      }
    }
  }

  return [...totals.entries()]
    .map(([id, total]) => ({
      id,
      name: members.value.find((member) => String(member.id) === String(id))?.name ?? '',
      total
    }))
    .filter((badge) => badge.name)
})
</script>

<template>
  <main
    class="min-h-screen w-full overflow-x-hidden bg-(--app-bg) flex flex-col py-2 md:py-4 px-4 md:px-8 pb-15 md:pb-5"
  >
    <div class="relative mt-2 flex w-full flex-col items-center gap-3 md:mt-36">
      <div class="hidden w-full items-center justify-center gap-3 md:flex">
        <div class="flex max-w-[50vw] flex-col items-center gap-2">
          <div class="flex flex-wrap justify-center gap-2">
            <div
              v-for="(resource, index) in resources"
              :key="resource.id"
              class="flex h-fit rounded-full px-2.5 py-1.5 text-sm tracking-tighter"
              :class="cardBgColors[index % cardBgColors.length]"
            >
              {{ resource.name }}: {{ selectedCost(resource) }} €
            </div>
          </div>
          <div v-if="memberTripTotals.length" class="flex flex-wrap justify-center gap-2">
            <div
              v-for="badge in memberTripTotals"
              :key="badge.id"
              class="rounded-full bg-(--ui-text) px-2.5 py-1.5 text-sm text-(--ui-text-contrast) tracking-tighter"
            >
              {{ badge.name }}: {{ badge.total.toFixed(2) }} €
            </div>
          </div>
        </div>
        <div
          class="flex shrink-0 flex-row gap-1 rounded-full bg-(--ui-text) px-3 py-2 font-bold whitespace-nowrap text-(--ui-text-contrast)"
        >
          <span>{{ t('common.total') }}</span>
          {{ tripTotal.toFixed(2) }}
          €
        </div>
      </div>
      <div class="flex w-full flex-col items-end gap-2 md:hidden">
        <div
          class="flex flex-col gap-1 rounded-full bg-(--ui-text) px-2 py-2 whitespace-nowrap text-(--ui-text-contrast)"
        >
          <span class="hidden md:inline">{{ t('common.total') }}</span>
          {{ tripTotal.toFixed(2) }}
          €
        </div>
        <div v-if="memberTripTotals.length" class="flex max-w-[60vw] flex-wrap justify-end gap-1">
          <div
            v-for="badge in memberTripTotals"
            :key="badge.id"
            class="rounded-full bg-(--ui-text) px-2.5 py-1 text-xs text-(--ui-text-contrast) tracking-tighter"
          >
            {{ badge.name }}: {{ badge.total.toFixed(2) }} €
          </div>
        </div>
      </div>
    </div>
    <div class="relative mt-10 flex w-full items-center justify-center gap-8">
      <div class="flex w-full items-end justify-end gap-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="t('planning.search')"
          size="lg"
          class="w-full max-w-md"
          :ui="{
            base: 'rounded-full border-2 border-(--ui-bg-elevated) py-2 ps-11 pe-4 text-(--ui-bg-elevated) placeholder:text-(--ui-bg-elevated)/90 ring-0 focus-visible:ring-2 focus-visible:ring-(--ui-text)/30 focus-visible:bg-(--ui-text)/80 hover:bg-(--ui-text)/80',
            leadingIcon: 'size-5 text-(--ui-bg-elevated)/90'
          }"
        />
        <div v-if="canBeEdited" class="flex shrink-0 flex-col items-end gap-1">
          <div class="flex items-center gap-1">
            <span class="text-sm font-semibold text-(--ui-text)/70">{{ members.length }}</span>
            <UIcon name="i-heroicons-user-group" class="size-3 md:size-4 text-(--ui-text)/70" />
            <UButton
              icon="i-heroicons-user-plus"
              variant="subtle"
              :aria-label="t('planning.members')"
              class="w-fit rounded-full p-2"
              color="neutral"
              :ui="{ leadingIcon: 'size-4 md:size-5' }"
              @click="membersModalOpen = true"
            />
          </div>

          <UModal
            :title="t('planning.newGroup')"
            :ui="{
              title: 'text-(--ui-text-contrast) tracking-tight',
              content: ' bg-(--ui-text)',
              close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
            }"
            :open="addGroupModalOpen"
            @update:open="addGroupModalOpen = $event"
          >
            <UButton
              icon="i-heroicons-plus"
              :label="t('planning.newGroup')"
              color="neutral"
              variant="subtle"
              class="w-fit rounded-full"
              :ui="{ leadingIcon: 'size-4 md:size-5' }"
              @click="openAddGroupModal"
            >
              <span class="hidden md:inline">{{ t('planning.newGroup') }}</span>
              <span class="inline md:hidden">{{ t('planning.group') }}</span>
            </UButton>

            <template #body>
              <UForm id="add-place-form" class="flex flex-col gap-3" :on-submit="saveGroup">
                <UFormField
                  :label="t('common.name')"
                  :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                >
                  <UInput
                    v-model="groupName"
                    :placeholder="t('common.exampleName')"
                    required
                    :ui="{
                      base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                    }"
                    class="w-full"
                  />
                </UFormField>
                <!-- <UFormField
              label="Descripción"
              :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
            >
              <UTextarea
                v-model="groupDescription"
                :rows="2"
                class="w-full"
                :ui="{
                  base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                }"
              />
            </UFormField> -->
              </UForm>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton type="submit" form="add-place-form" class="rounded-full">
                  {{ t('common.save') }}
                </UButton>
              </div>
            </template>
          </UModal>
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <div class="mt-2 columns-1 gap-2 md:columns-2">
        <div
          v-for="(resource, index) in filteredResources"
          :key="resource.id"
          class="mb-2 break-inside-avoid p-2 md:p-4 rounded-md flex flex-col gap-2 md:gap-4"
          :class="groupCardBgs[index % groupCardBgs.length]"
        >
          <div class="flex gap-2 items-center justify-between">
            <p class="font-semibold text-lg md:text-xl text-(--ui-text) tracking-tight">
              {{ resource.name }}
            </p>

            <div v-if="canBeEdited" class="flex gap-2 items-center">
              <UButton
                icon="i-heroicons-trash"
                :aria-label="t('planning.deleteGroup')"
                variant="solid"
                class="w-fit self-end text-(--ui-text-contrast) bg-(--ui-text) rounded-full"
                :ui="{ leadingIcon: 'size-4 md:size-5' }"
                @click="removeGroup(resource.id)"
              >
                <span class="hidden md:inline">{{ t('planning.deleteGroup') }}</span>
              </UButton>
              <UModal
                :title="t('planning.newCategory')"
                :open="addCategoryModalOpen && selectedGroupId === resource.id"
                :ui="{
                  title: 'text-(--ui-text-contrast) tracking-tight',
                  content: 'bg-(--ui-text)',
                  close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
                }"
                @update:open="addCategoryModalOpen = $event"
              >
                <UButton
                  icon="i-heroicons-plus"
                  :aria-label="t('planning.newCategory')"
                  variant="solid"
                  class="w-fit self-end rounded-full text-(--ui-text-contrast)"
                  :ui="{ leadingIcon: 'size-4 md:size-5' }"
                  @click="openAddCategoryModal(resource.id)"
                >
                  <span class="hidden md:inline">{{ t('planning.newCategory') }}</span>
                </UButton>

                <template #body>
                  <UForm
                    :id="`add-category-form-${resource.id}`"
                    class="flex flex-col gap-3"
                    :state="{ name: categoryName }"
                    @submit="saveCategory"
                  >
                    <UFormField
                      :label="t('common.name')"
                      name="name"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                    >
                      <UInput
                        v-model="categoryName"
                        :placeholder="t('common.exampleName')"
                        required
                        :ui="{
                          base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                        }"
                        class="w-full"
                      />
                    </UFormField>
                  </UForm>
                </template>

                <template #footer>
                  <div class="flex w-full justify-end gap-2">
                    <UButton
                      type="submit"
                      :form="`add-category-form-${resource.id}`"
                      class="rounded-full text-(--ui-text-contrast)"
                    >
                      {{ t('common.add') }}
                    </UButton>
                  </div>
                </template>
              </UModal>
            </div>
          </div>

          <div
            v-for="category in resource.categories"
            :key="category.id"
            class="flex flex-col gap-2 rounded-md p-2 md:p-4 bg-(--category-card-bg)"
          >
            <div class="flex gap-2 items-center justify-between">
              <p class="font-semibold text-md md:text-lg text-(--ui-text-contrast) tracking-tight">
                {{ category.name }}
              </p>

              <div v-if="canBeEdited" class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-trash"
                  :aria-label="t('planning.deleteCategory')"
                  variant="solid"
                  class="rounded-full text-(--ui-text-contrast) bg-(--ui-primary)"
                  :ui="{ leadingIcon: 'size-4 md:size-5' }"
                  @click="removeCategory(category.id, resource.id)"
                >
                  <span class="hidden md:inline">{{ t('planning.deleteCategory') }}</span>
                </UButton>

                <UModal
                  :open="addOptionModalOpen && selectedCategoryId === category.id"
                  :title="t('planning.newOption')"
                  :ui="{
                    title: 'text-(--ui-text-contrast) tracking-tight',
                    content: ' bg-(--ui-text)',
                    close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
                  }"
                >
                  <UButton
                    icon="i-heroicons-plus"
                    variant="solid"
                    class="w-fit self-end bg-(--ui-text) text-(--ui-text-contrast) rounded-full"
                    :ui="{ leadingIcon: 'size-4 md:size-5' }"
                    @click="openAddOptionModal(category.id)"
                  >
                    <span class="hidden md:inline">{{ t('planning.newOption') }}</span>
                  </UButton>

                  <template #body>
                    <UForm id="add-place-form" class="flex flex-col gap-3" :on-submit="saveOption">
                      <UFormField
                        :label="t('common.name')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)'
                        }"
                      >
                        <UInput
                          v-model="optionName"
                          :placeholder="t('common.exampleName')"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.price')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)'
                        }"
                      >
                        <UInput
                          v-model="optionPrice"
                          placeholder="20.00"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.url')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)'
                        }"
                      >
                        <UInput
                          v-model="optionLink"
                          placeholder="https://www.google.com"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.quantity')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)'
                        }"
                      >
                        <UInput
                          v-model="optionQuantity"
                          placeholder="1"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)'
                          }"
                          class="w-full"
                        />
                      </UFormField>
                    </UForm>
                  </template>
                  <template #footer>
                    <div class="flex w-full justify-end gap-2">
                      <UButton
                        type="submit"
                        form="add-place-form"
                        class="rounded-full text-(--ui-text-contrast)"
                      >
                        {{ t('common.add') }}
                      </UButton>
                    </div>
                  </template>
                </UModal>
              </div>
            </div>
            <div
              v-for="option in category.options"
              :key="option.id"
              class="flex items-center gap-2"
            >
              <div class="flex shrink-0 flex-col items-center gap-1">
                <UCheckbox
                  :model-value="option.selected"
                  :disabled="!canBeEdited"
                  :ui="{
                    base: 'border-2 border-(--ui-bg) data-[state=checked]:border-(--ui-bg)',
                    indicator: 'bg-(--ui-bg) text-(--ui-text)'
                  }"
                  @update:model-value="updateOptionSelection(option.id, category.id)"
                />
                <span
                  v-if="memberName(option)"
                  class="size-6 grid place-items-center text-center bg-(--ui-text-contrast) rounded-full text-[0.6rem] font-semibold leading-tight text-(--ui-text)"
                >
                  <span class="w-full min-w-0 truncate">{{ memberName(option) }}</span>
                </span>
              </div>

              <div
                class="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md pt-3 pb-3.5 px-3"
                :class="optionMatchesSearch(option) ? 'bg-red-200' : 'bg-blue-200'"
              >
                <div
                  class="min-w-0 flex flex-col items-start justify-center gap-1 w-1/2 md:w-3/5 shrink-0"
                >
                  <p class="text-(--ui-text) font-semibold tracking-tight">
                    {{ option.name }}
                  </p>
                  <UButton
                    v-if="option.link"
                    :to="option.link"
                    target="_blank"
                    leading-icon="i-heroicons-link"
                    variant="link"
                    :aria-label="t('planning.itemLink')"
                    class="max-md:hidden w-fit p-0 text-(--ui-text)/80 text-xs italic tracking-tighter"
                    :ui="{ leadingIcon: 'size-4' }"
                  >
                    <span>{{ t('planning.itemLink') }}</span>
                  </UButton>
                </div>
                <div class="flex min-w-0 flex-1 items-center justify-end md:gap-10 gap-2">
                  <p class="text-xs md:text-sm text-(--ui-text)/70 text-right">
                    {{ option.quantity }} x {{ option.unit_price }}€
                  </p>

                  <p class="text-sm md:text-md text-(--ui-text) font-semibold whitespace-nowrap">
                    {{ option.quantity * option.unit_price }} €
                  </p>

                  <UDropdownMenu
                    v-if="canBeEdited || (isMobile && option.link)"
                    :items="optionMenuItems(option, category.id)"
                    :ui="{
                      content: 'bg-(--ui-text) rounded-xl',
                      item: 'text-(--ui-text-contrast) rounded-xl hover:bg-(--ui-text-contrast)/10',
                      itemLabel: 'text-(--ui-text-contrast)',
                      itemLeading: 'text-(--ui-text-contrast)'
                    }"
                  >
                    <UButton
                      icon="i-heroicons-ellipsis-horizontal"
                      :aria-label="t('common.actions')"
                      variant="link"
                      class="w-fit text-(--ui-text) hover:text-(--ui-text-contrast)/80 rounded-full"
                    />
                  </UDropdownMenu>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <div class="text-(--ui-text) font-semibold">
                {{ t('common.total') }}
                {{
                  category.options?.reduce((acc, option) => {
                    if (option.selected) {
                      return acc + option.quantity * option.unit_price
                    }
                    return acc
                  }, 0)
                }}
                €
              </div>
              <div v-if="memberTotals(category).length" class="flex flex-wrap justify-end gap-1">
                <span
                  v-for="bubble in memberTotals(category)"
                  :key="bubble.id"
                  class="rounded-full bg-(--ui-text) px-2.5 py-1 text-[0.6rem] font-bold text-(--ui-text-contrast)"
                >
                  {{ bubble.name }} {{ bubble.total }} €
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-2 items-center justify-end">
            <p class="text-(--ui-text) font-bold tracking-tight">
              {{ t('common.total') }}
              {{
                resource?.categories?.reduce((acc, category) => {
                  return (
                    acc +
                    category.options?.reduce((acc, option) => {
                      if (option.selected) {
                        return acc + option.quantity * option.unit_price
                      }
                      return acc
                    }, 0)
                  )
                }, 0)
              }}
              €
            </p>
          </div>
        </div>
      </div>
      <p
        v-if="search.trim() && !filteredResources.length"
        class="mt-8 text-center text-sm text-(--ui-text)/70"
      >
        {{ t('planning.noResults') }}
      </p>
      <!--
      <p class="text-(--ui-text) font-semibold tracking-tight self-end">
        Total del viaje:
        {{
          resources.reduce((acc, resource) => {
            return (
              acc +
              resource.categories.reduce((acc, category) => {
                return (
                  acc +
                  category.options?.reduce((acc, option) => {
                    if (option.selected) {
                      return acc + option.quantity * option.unit_price;
                    }
                    return acc;
                  }, 0)
                );
              }, 0)
            );
          }, 0)
        }}
        €
      </p>
      -->
    </div>

    <UModal
      v-model:open="membersModalOpen"
      :title="t('planning.members')"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="member in members"
              :key="member.id"
              class="inline-flex items-center gap-1 rounded-full bg-(--ui-text-contrast) px-3 py-1 text-xs font-bold text-(--ui-text)"
            >
              {{ member.name }}
              <button
                type="button"
                class="leading-none"
                :aria-label="t('common.delete')"
                @click="removeMember(member.id)"
              >
                ×
              </button>
            </span>
          </div>
          <form class="flex gap-2" @submit.prevent="addMember">
            <UInput
              v-model="memberNameInput"
              :placeholder="t('planning.memberPlaceholder')"
              class="w-full"
            />
            <UButton type="submit" class="rounded-full" :label="t('planning.addMember')" />
          </form>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="editOptionModalOpen"
      :title="t('planning.editOption')"
      :dismissible="!editOptionSaving"
      :close="!editOptionSaving"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"
    >
      <template #body>
        <UForm
          id="edit-option-form"
          :state="editOptionForm"
          class="flex flex-col gap-3"
          @submit="saveEditedOption"
        >
          <UFormField
            :label="t('common.name')"
            name="name"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput v-model="editOptionForm.name" required class="w-full" />
          </UFormField>

          <UFormField
            :label="t('common.price')"
            name="price"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editOptionForm.price"
              type="number"
              min="0"
              step="0.01"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('common.url')"
            name="link"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput v-model="editOptionForm.link" class="w-full" />
          </UFormField>

          <UFormField
            :label="t('common.quantity')"
            name="quantity"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editOptionForm.quantity"
              type="number"
              min="1"
              step="1"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('planning.member')"
            name="memberId"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <USelect
              v-model="editOptionForm.memberId"
              :items="memberOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p v-if="editOptionError" role="alert" class="text-sm text-red-500">
            {{ editOptionError }}
          </p>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            class="rounded-full"
            :label="t('common.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="editOptionSaving"
            @click="editOptionModalOpen = false"
          />

          <UButton
            class="rounded-full"
            type="submit"
            form="edit-option-form"
            :label="t('common.save')"
            :loading="editOptionSaving"
          />
        </div>
      </template>
    </UModal>
  </main>
</template>
