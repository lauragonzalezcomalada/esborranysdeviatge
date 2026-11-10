<script setup>
const tripId = useRoute().params.slug;

const { loadTrip } = useTripPlaces();
const {
  loadTripResources,
  insertGroup,
  deleteGroup,
  insertCategory,
  insertOption,
  updateOption,
  updateOptionSelected,
  deleteOption,
} = useTripResources();

const resources = ref([]);
const trip = ref(null);

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
  addGroupModalOpen.value = true;
}
onMounted(async () => {
  trip.value = await loadTrip(tripId);
  resources.value = await loadTripResources(tripId);
});

async function saveGroup() {
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
  selectedGroupId.value = groupId;
  addCategoryModalOpen.value = true;
}

async function saveCategory() {
  try {
    const group = resources.value.find(
      (resource) => resource.id === selectedGroupId.value,
    );

    if (!group) throw new Error("No se ha encontrado el grupo");

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
  selectedCategoryId.value = categoryId;
  addOptionModalOpen.value = true;
}

async function saveOption() {
  try {
    const category = resources.value
      .flatMap((group) => group.categories ?? [])
      .find((category) => category.id === selectedCategoryId.value);

    if (!category) throw new Error("Category not found");

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
  try {
    await deleteGroup(groupId);
    resources.value = resources.value.filter((r) => r.id !== groupId);
  } catch (error) {
    console.error(error);
  }
}

async function removeOption(optionId, categoryId) {
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

    if (!option) throw new Error("Option not found");

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
</script>

<template>
  <main
    class="min-h-screen w-full overflow-hidden bg-(--app-bg) flex flex-col py-4 px-8"
  >
    <div class="flex flex-col max-w-sm">
      <UButton
        class="px-0 text-sm font-medium text-(--ui-bg-elevated) tracking-[0.18em] uppercase hover:font-bold hover:text-(--ui-bg-elevated) transition-all duration-300"
        variant="link"
        @click="navigateTo('/')"
      >
        Borradores de viaje
      </UButton>
      <!-- <TripHeader v-if="trip" :trip="trip" /> -->
    </div>
    <div class="flex flex-col">
      <UModal
        title="Nuevo grupo"
        :ui="{
          title: 'text-(--ui-text-contrast) tracking-tight',
          content: ' bg-(--ui-text)',
          close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
        }"
        :open="addGroupModalOpen"
      >
        <UButton
          icon="i-heroicons-plus"
          label="Nuevo grupo"
          color="neutral"
          variant="subtle"
          class="w-fit self-end"
          @click="openAddGroupModal"
        />

        <template #body>
          <UForm
            id="add-place-form"
            class="flex flex-col gap-3"
            :on-submit="saveGroup"
          >
            <UFormField
              label="Nombre"
              :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
            >
              <UInput
                v-model="groupName"
                placeholder="Ej.: Ropa de baño"
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
            <UButton type="submit" form="add-place-form"> Guardar </UButton>
          </div>
        </template>
      </UModal>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        <div
          v-for="resource in resources"
          :key="resource.id"
          class="p-4 rounded-md bg-(--ui-bg-elevated) flex flex-col gap-4"
        >
          <div class="flex gap-2 items-center justify-between">
            <p class="font-medium text-(--ui-text)">
              {{ resource.name }}
            </p>

            <div class="flex gap-2 items-center">
              <UButton
                icon="i-heroicons-trash"
                aria-label="Borrar grupo"
                variant="solid"
                class="w-fit self-end text-(--ui-text-contrast) bg-(--ui-text)"
                @click="removeGroup(resource.id)"
              >
                <span class="hidden md:inline">Borrar grupo</span>
              </UButton>
              <UModal
                title="Nueva categoría"
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
                  aria-label="Nueva categoría"
                  variant="solid"
                  class="w-fit self-end"
                  @click="openAddCategoryModal(resource.id)"
                >
                  <span class="hidden md:inline">Nueva categoría</span>
                </UButton>

                <template #body>
                  <UForm
                    :id="`add-category-form-${resource.id}`"
                    class="flex flex-col gap-3"
                    :state="{ name: categoryName }"
                    @submit="saveCategory"
                  >
                    <UFormField
                      label="Nombre"
                      name="name"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                    >
                      <UInput
                        v-model="categoryName"
                        placeholder="Ej.: Ropa de baño"
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
                    >
                      Añadir
                    </UButton>
                  </div>
                </template>
              </UModal>
              <!--   <UModal
                title="Nueva categoría"
                :ui="{
                  title: 'text-(--ui-text-contrast) tracking-tight',
                  content: ' bg-(--ui-text)',
                  close:
                    'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
                }"
                :open="addCategoryModalOpen"
              >
                <UButton
                  icon="i-heroicons-plus"
                  variant="solid"
                  class="w-fit self-end"
                  @click="openAddCategoryModal(resource.id)"
                >
                  <span class="hidden md:inline">Nueva categoría</span>
                </UButton>
                <template #body>
                  <UForm
                    id="add-place-form"
                    class="flex flex-col gap-3"
                    :on-submit="saveCategory"
                    :state="{ groupId: resource.id }"
                  >
                    <UFormField
                      label="Nombre"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                    >
                      <UInput
                        v-model="categoryName"
                        placeholder="Ej.: Ropa de baño"
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
                    <UButton type="submit" form="add-place-form">
                      Añadir
                    </UButton>
                  </div>
                </template>
              </UModal> -->
            </div>
          </div>

          <div
            v-for="category in resource.categories"
            :key="category.id"
            class="flex flex-col gap-2 rounded-md p-2 bg-(--ui-text-contrast)"
          >
            <div class="flex gap-2 items-center justify-between">
              <p class="font-bold text-(--ui-text)">{{ category.name }}</p>
              <UModal
                :open="addOptionModalOpen && selectedCategoryId === category.id"
                title="Nueva opción"
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
                  class="w-fit self-end bg-(--ui-text) text-(--ui-text-contrast)"
                  @click="openAddOptionModal(category.id)"
                >
                  <span class="hidden md:inline">Nueva opción</span>
                </UButton>

                <template #body>
                  <UForm
                    id="add-place-form"
                    class="flex flex-col gap-3"
                    :on-submit="saveOption"
                  >
                    <UFormField
                      label="Nombre"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
                    >
                      <UInput
                        v-model="optionName"
                        placeholder="Ej.: Ropa de baño"
                        required
                        :ui="{
                          base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                        }"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField
                      label="Precio"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
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
                      label="Enlace"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
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
                      label="Cantidad"
                      :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
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
                    <UButton type="submit" form="add-place-form">
                      Añadir
                    </UButton>
                  </div>
                </template>
              </UModal>
            </div>
            <div
              v-for="option in category.options"
              :key="option.id"
              class="flex gap-2 bg-blue-200 rounded-md p-2 items-center justify-between"
            >
              <div class="flex flex-col">
                <p class="text-sm text-(--ui-text) font-semibold">
                  {{ option.name }}
                </p>
                <p class="text-xs text-(--ui-text) italic">{{ option.link }}</p>
              </div>

              <p class="text-sm text-(--ui-text)">
                {{ option.quantity }} x
                <span class="font-semibold">{{ option.unit_price }}</span
                >€
              </p>
              <UCheckbox
                :model-value="option.selected"
                @update:model-value="
                  updateOptionSelection(option.id, category.id)
                "
                class="w-fit"
              />
              <p class="text-sm text-(--ui-text) font-semibold">
                {{ option.quantity * option.unit_price }} €
              </p>

              <!-- <UButton
                icon="i-heroicons-trash"
                variant="link"
                class="w-fit self-end text-(--ui-text-contrast) hover:text-(--ui-text-contrast)/80"
                @click="removeOption(option.id, category.id)"
              /> -->
              <UDropdownMenu
                :items="[
                  {
                    label: 'Editar',
                    icon: 'i-heroicons-pencil-square',
                    onSelect: () => openEditOptionModal(option, category.id),
                  },
                  {
                    label: 'Eliminar',
                    icon: 'i-heroicons-trash',
                    color: 'error',
                    onSelect: () => removeOption(option.id, category.id),
                  },
                ]"
              >
                <UButton
                  icon="i-heroicons-ellipsis-horizontal"
                  aria-label="Acciones de la opción"
                  variant="link"
                  class="w-fit text-(--ui-text) hover:text-(--ui-text)/80"
                />
              </UDropdownMenu>
            </div>
            <div class="text-(--ui-text) font-semibold self-end">
              Total:
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
        </div>
      </div>
    </div>

    <UModal
      v-model:open="editOptionModalOpen"
      title="Editar opción"
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
            label="Nombre"
            name="name"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput v-model="editOptionForm.name" required class="w-full" />
          </UFormField>

          <UFormField
            label="Precio"
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
            label="Enlace"
            name="link"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput v-model="editOptionForm.link" class="w-full" />
          </UFormField>

          <UFormField
            label="Cantidad"
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
            label="Cancelar"
            color="neutral"
            variant="subtle"
            :disabled="editOptionSaving"
            @click="editOptionModalOpen = false"
          />

          <UButton
            type="submit"
            form="edit-option-form"
            label="Guardar"
            :loading="editOptionSaving"
          />
        </div>
      </template>
    </UModal>
  </main>
</template>
