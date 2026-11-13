<script setup>
definePageMeta({
  layout: "trip",
});

const tripId = useRoute().params.slug;
const { t } = useI18n();

const { canBeEdited } = useTripShell();

const {
  loadTripEquipment,
  insertGroup,
  deleteGroup,
  insertCategory,
  insertOption,
  updateOption,
  updateOptionSelected,
  deleteOption,
  deleteCategory,
} = useTripEquipment();

const resources = ref([]);

const groupName = ref("");
const categoryName = ref("");
const addGroupModalOpen = ref(false);

const selectedGroupId = ref(null);
const addCategoryModalOpen = ref(false);

const selectedCategoryId = ref(null);
const addOptionModalOpen = ref(false);

const optionName = ref("");
const optionPrice = ref("");
const optionLink = ref("");
const optionQuantity = ref(1);

function openAddGroupModal() {
  if (!canBeEdited.value) {
    return;
  }
  addGroupModalOpen.value = true;
}
onMounted(async () => {
  resources.value = await loadTripEquipment(tripId);
});

async function saveGroup() {
  if (!canBeEdited.value) {
    return;
  }
  try {
    const group = await insertGroup({ name: groupName.value, tripId: tripId });
    resources.value.push(group);
    addGroupModalOpen.value = false;
    groupName.value = "";
  } catch (error) {
    console.error(error);
  }
}

function openAddCategoryModal(groupId) {
  if (!canBeEdited.value) {
    return;
  }
  selectedGroupId.value = groupId;
  addCategoryModalOpen.value = true;
}

async function saveCategory() {
  if (!canBeEdited.value) {
    return;
  }
  try {
    const group = resources.value.find(
      (resource) => resource.id === selectedGroupId.value,
    );

    if (!group) throw new Error(t("planning.groupNotFound"));

    const category = await insertCategory({
      name: categoryName.value,
      groupId: group.id,
    });

    group.categories ??= [];
    group.categories.push({
      ...category,
      options: category.options ?? [],
    });

    addCategoryModalOpen.value = false;
    categoryName.value = "";
  } catch (error) {
    console.error("Error al guardar la categoría:", error);
  }
}

function openAddOptionModal(categoryId) {
  if (!canBeEdited.value) {
    return;
  }
  selectedCategoryId.value = categoryId;
  addOptionModalOpen.value = true;
}

async function saveOption() {
  if (!canBeEdited.value) {
    return;
  }
  try {
    const category = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === selectedCategoryId.value);

    if (!category) throw new Error(t("planning.categoryNotFound"));

    const option = await insertOption({
      name: optionName.value,
      price: optionPrice.value,
      link: optionLink.value,
      quantity: optionQuantity.value,
      categoryId: category.id,
    });

    category.options ??= [];
    category.options.push(option);

    addOptionModalOpen.value = false;
    optionName.value = "";
    optionPrice.value = "";
    optionLink.value = "";
    optionQuantity.value = "";
  } catch (error) {
    console.error(error);
  }
}

async function updateOptionSelection(optionId, categoryId) {
  if (!canBeEdited.value) {
    return;
  }
  const option = resources.value
    .flatMap((group) => group.categories ?? [])
    .find((category) => category.id === categoryId)
    .options.find((o) => o.id === optionId);
  option.selected = !option.selected;
  try {
    await updateOptionSelected({
      id: optionId,
      selected: option.selected,
    });
  } catch (error) {
    console.error(error);
  }
}

async function removeGroup(groupId) {
  if (!canBeEdited.value) {
    return;
  }
  if (!confirm(t("planning.confirmDeleteGroup"))) {
    return;
  }
  try {
    await deleteGroup(groupId);
    resources.value = resources.value.filter((r) => r.id !== groupId);
  } catch (error) {
    console.error(error);
  }
}

async function removeOption(optionId, categoryId) {
  if (!canBeEdited.value) {
    return;
  }
  if (!confirm(t("planning.confirmDeleteOption"))) {
    return;
  }
  try {
    await deleteOption(optionId);
    resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === categoryId).options = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === categoryId)
      .options.filter((o) => o.id !== optionId);
  } catch (error) {
    console.error(error);
  }
}

const editOptionModalOpen = ref(false);
const editOptionSaving = ref(false);
const editOptionError = ref("");
const editingOptionId = ref(null);
const editingCategoryId = ref(null);

const editOptionForm = reactive({
  name: "",
  price: "",
  link: "",
  quantity: "",
});

function openEditOptionModal(option, categoryId) {
  if (!canBeEdited.value) {
    return;
  }
  editingOptionId.value = option.id;
  editingCategoryId.value = categoryId;
  editOptionError.value = "";

  Object.assign(editOptionForm, {
    name: option.name,
    price: String(option.unit_price ?? ""),
    link: option.link ?? "",
    quantity: String(option.quantity ?? ""),
  });

  editOptionModalOpen.value = true;
}

async function saveEditedOption() {
  if (!canBeEdited.value) {
    return;
  }
  if (editOptionSaving.value) return;

  editOptionError.value = "";

  const changes = {
    name: editOptionForm.name.trim(),
    unit_price: Number(editOptionForm.price),
    link: editOptionForm.link.trim(),
    quantity: Number(editOptionForm.quantity),
  };

  if (
    !changes.name ||
    editOptionForm.price === "" ||
    editOptionForm.quantity === "" ||
    !Number.isFinite(changes.unit_price) ||
    changes.unit_price < 0 ||
    !Number.isInteger(changes.quantity) ||
    changes.quantity < 1
  ) {
    editOptionError.value = "Revisa el nombre, el precio y la cantidad.";
    return;
  }

  editOptionSaving.value = true;

  try {
    const category = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === editingCategoryId.value);

    const option = category?.options?.find(
      (option) => option.id === editingOptionId.value,
    );

    if (!option) throw new Error(t("planning.optionNotFound"));

    await updateOption({
      id: option.id,
      ...changes,
    });

    Object.assign(option, changes);
    editOptionModalOpen.value = false;
  } catch (error) {
    console.error(error);
    editOptionError.value = "No se ha podido guardar la opción.";
  } finally {
    editOptionSaving.value = false;
  }
}

async function removeCategory(categoryId, groupId) {
  if (!canBeEdited.value) {
    return;
  }
  if (!confirm(t("planning.confirmDeleteCategory"))) {
    return;
  }
  try {
    await deleteCategory(categoryId);

    const group = resources.value.find((resource) => resource.id === groupId);

    if (group) {
      group.categories = group.categories.filter(
        (category) => category.id !== categoryId,
      );
    }
  } catch (error) {
    console.error("Error al eliminar la categoría:", error);
  }
}

const cardBgColors = ref([
  "bg-(--ui-primary)/70 text-(--card-text-contrast)",
  "bg-(--ui-bg)/70",
  "bg-(--app-fg)/70",
]);

function selectedCost(resource) {
  return (resource.categories ?? []).reduce((subtotal, category) => {
    return (
      subtotal +
      (category.options ?? []).reduce((sum, option) => {
        return option.selected
          ? sum +
              (Number(option.quantity) || 0) * (Number(option.unit_price) || 0)
          : sum;
      }, 0)
    );
  }, 0);
}

const tripTotal = computed(() =>
  (resources.value ?? []).reduce(
    (total, resource) => total + selectedCost(resource),
    0,
  ),
);
</script>

<template>
  <main
    class="min-h-screen w-full overflow-hidden bg-(--app-bg) flex flex-col py-2 md:py-4 px-4 md:px-8 pb-15 md:pb-0"
  >
    <div
      class="relative mt-4 flex w-full items-center justify-end gap-3 md:mt-24"
    >
      <div
        class="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
      >
        <div class="relative">
          <div class="flex max-w-[50vw] flex-wrap justify-center gap-2">
            <div
              v-for="(resource, index) in resources"
              :key="resource.id"
              class="flex h-fit rounded-full px-2.5 py-1.5 text-sm"
              :class="cardBgColors[index % cardBgColors.length]"
            >
              {{ resource.name }}: {{ selectedCost(resource) }} €
            </div>
          </div>
          <div
            class="absolute top-1/2 left-full ml-3 flex -translate-y-1/2 flex-row gap-1 rounded-full bg-(--ui-text) px-3 py-2 font-bold whitespace-nowrap text-(--ui-text-contrast)"
          >
            <span>{{ t("common.total") }}</span>
            {{ tripTotal.toFixed(2) }}
            €
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-1 rounded-full bg-(--ui-text) px-2 py-2 font-bold whitespace-nowrap text-(--ui-text-contrast) md:hidden"
      >
        <span class="hidden md:inline">{{ t("common.total") }}</span>
        {{ tripTotal.toFixed(2) }}
        €
      </div>
      <UModal
        v-if="canBeEdited"
        :title="t('planning.newGroup')"
        :ui="{
          title: 'text-(--ui-text-contrast) tracking-tight',
          content: ' bg-(--ui-text)',
          close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
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
          @click="openAddGroupModal"
          :ui="{ leadingIcon: 'size-4 md:size-5' }"
        >
          <span class="hidden md:inline">{{ t("planning.newGroup") }}</span>
          <span class="inline md:hidden">{{ t("planning.group") }}</span>
        </UButton>

        <template #body>
          <UForm
            id="add-place-form"
            class="flex flex-col gap-3"
            :on-submit="saveGroup"
          >
            <UFormField
              :label="t('common.name')"
              :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
            >
              <UInput
                v-model="groupName"
                :placeholder="t('common.exampleName')"
                required
                :ui="{
                  base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                }"
                class="w-full"
              />
            </UFormField>
            <!--<UFormField
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
              {{ t("common.save") }}
            </UButton>
          </div>
        </template>
      </UModal>
    </div>
    <div class="flex flex-col">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8">
        <div
          v-for="resource in resources"
          :key="resource.id"
          class="p-2 md:p-4 rounded-md bg-(--ui-bg-elevated) flex flex-col gap-2 md:gap-4 h-fit"
        >
          <div class="flex gap-2 items-center justify-between">
            <p
              class="font-semibold text-lg md:text-xl text-(--ui-text) tracking-tight"
            >
              {{ resource.name }}
            </p>

            <div v-if="canBeEdited" class="flex gap-2 items-center">
              <UButton
                icon="i-heroicons-trash"
                :aria-label="t('planning.deleteGroup')"
                variant="solid"
                class="w-fit self-end text-(--ui-text-contrast) bg-(--ui-text) rounded-full"
                @click="removeGroup(resource.id)"
                :ui="{ leadingIcon: 'size-4 md:size-5' }"
              >
                <span class="hidden md:inline">{{
                  t("planning.deleteGroup")
                }}</span>
              </UButton>
              <UModal
                :title="t('planning.newCategory')"
                :open="addCategoryModalOpen && selectedGroupId === resource.id"
                @update:open="addCategoryModalOpen = $event"
                :ui="{
                  title: 'text-(--ui-text-contrast) tracking-tight',
                  content: 'bg-(--ui-text)',
                  close:
                    'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
                }"
              >
                <UButton
                  icon="i-heroicons-plus"
                  :aria-label="t('planning.newCategory')"
                  variant="solid"
                  class="w-fit self-end rounded-full text-(--ui-text-contrast)"
                  @click="openAddCategoryModal(resource.id)"
                  :ui="{ leadingIcon: 'size-4 md:size-5' }"
                >
                  <span class="hidden md:inline">{{
                    t("planning.newCategory")
                  }}</span>
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
                          base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
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
                      {{ t("common.add") }}
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
              <p
                class="font-semibold text-md md:text-lg text-(--ui-text-contrast) tracking-tight"
              >
                {{ category.name }}
              </p>

              <div v-if="canBeEdited" class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-trash"
                  :aria-label="t('planning.deleteCategory')"
                  variant="solid"
                  class="rounded-full text-(--ui-text-contrast) bg-(--ui-primary)"
                  @click="removeCategory(category.id, resource.id)"
                  :ui="{ leadingIcon: 'size-4 md:size-5' }"
                >
                  <span class="hidden md:inline">{{
                    t("planning.deleteCategory")
                  }}</span>
                </UButton>

                <UModal
                  :open="
                    addOptionModalOpen && selectedCategoryId === category.id
                  "
                  :title="t('planning.newOption')"
                  :ui="{
                    title: 'text-(--ui-text-contrast) tracking-tight',
                    content: ' bg-(--ui-text)',
                    close:
                      'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
                  }"
                >
                  <UButton
                    icon="i-heroicons-plus"
                    variant="solid"
                    class="w-fit self-end bg-(--ui-text) text-(--ui-text-contrast) rounded-full"
                    @click="openAddOptionModal(category.id)"
                    :ui="{ leadingIcon: 'size-4 md:size-5' }"
                  >
                    <span class="hidden md:inline">{{
                      t("planning.newOption")
                    }}</span>
                  </UButton>

                  <template #body>
                    <UForm
                      id="add-place-form"
                      class="flex flex-col gap-3"
                      :on-submit="saveOption"
                    >
                      <UFormField
                        :label="t('common.name')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)',
                        }"
                      >
                        <UInput
                          v-model="optionName"
                          :placeholder="t('common.exampleName')"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.price')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)',
                        }"
                      >
                        <UInput
                          v-model="optionPrice"
                          placeholder="20.00"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.url')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)',
                        }"
                      >
                        <UInput
                          v-model="optionLink"
                          placeholder="https://www.google.com"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                          }"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField
                        :label="t('common.quantity')"
                        :ui="{
                          label: 'font-semibold text-(--ui-text-contrast)',
                        }"
                      >
                        <UInput
                          v-model="optionQuantity"
                          placeholder="1"
                          required
                          :ui="{
                            base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
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
                        {{ t("common.add") }}
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
              <UCheckbox
                :model-value="option.selected"
                :disabled="!canBeEdited"
                @update:model-value="
                  updateOptionSelection(option.id, category.id)
                "
                :ui="{
                  base: 'border-2 border-(--ui-bg) data-[state=checked]:border-(--ui-bg)',
                  indicator: 'bg-(--ui-bg) text-(--ui-text)',
                }"
                class="shrink-0"
              />

              <div
                class="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-blue-200 p-2"
              >
                <div class="min-w-0 w-1/2 md:w-3/5 shrink-0">
                  <p class="text-(--ui-text) font-semibold tracking-tight">
                    {{ option.name }}
                  </p>
                  <a
                    :href="option.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block text-[0.35rem] md:text-[0.5rem] leading-tight text-(--ui-text) italic wrap-anywhere hover:underline"
                  >
                    {{ option.link }}
                  </a>
                </div>
                <div
                  class="flex min-w-0 flex-1 items-center justify-end md:gap-10 gap-2"
                >
                  <p class="text-xs md:text-sm text-(--ui-text)/70 text-right">
                    {{ option.quantity }} x {{ option.unit_price }}€
                  </p>

                  <p
                    class="text-sm md:text-md text-(--ui-text) font-semibold whitespace-nowrap"
                  >
                    {{ option.quantity * option.unit_price }} €
                  </p>

                  <UDropdownMenu
                    v-if="canBeEdited"
                    :items="[
                      {
                        label: t('common.edit'),
                        icon: 'i-heroicons-pencil-square',

                        onSelect: () =>
                          openEditOptionModal(option, category.id),
                      },
                      {
                        label: t('common.delete'),
                        icon: 'i-heroicons-trash',
                        color: 'error',
                        onSelect: () => removeOption(option.id, category.id),
                      },
                    ]"
                    :ui="{
                      content: 'bg-(--ui-text) rounded-xl',
                      item: 'text-(--ui-text-contrast) rounded-xl hover:bg-(--ui-text-contrast)/10',
                      itemLabel: 'text-(--ui-text-contrast)',
                      itemLeading: 'text-(--ui-text-contrast)',
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

            <div class="text-(--ui-text) font-semibold self-end">
              {{ t("common.total") }}
              {{
                category.options?.reduce((acc, option) => {
                  if (option.selected) {
                    return acc + option.quantity * option.unit_price;
                  }
                  return acc;
                }, 0)
              }}
              €
            </div>
          </div>
          <div class="flex gap-2 items-center justify-end">
            <p class="text-(--ui-text) font-bold tracking-tight">
              {{ t("common.total") }}
              {{
                resource?.categories?.reduce((acc, category) => {
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
              }}
              €
            </p>
          </div>
        </div>
      </div>
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
      v-model:open="editOptionModalOpen"
      :title="t('planning.editOption')"
      :dismissible="!editOptionSaving"
      :close="!editOptionSaving"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
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
