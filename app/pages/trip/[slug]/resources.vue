<script setup lang="ts">
import type { TripResource } from "~/composables/useTripResources";

definePageMeta({
  layout: "trip",
});

const tripId = useRoute().params.slug;
const { t } = useI18n();

const { loadTripResources, insertResource, deleteResource, updateResource } =
  useTripResources();

const resources = ref<TripResource[]>([]);

const search = ref("");
const addResourceModalOpen = ref(false);
const resourceName = ref("");
const resourceDescription = ref("");
const resourceLink = ref("");
const resourceFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const saveError = ref("");

const editResourceModalOpen = ref(false);
const editResourceId = ref("");
const editResourceName = ref("");
const editResourceDescription = ref("");
const editResourceLink = ref("");

onMounted(async () => {
  resources.value = await loadTripResources({ tripId: tripId as string });
});

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  resourceFile.value = input.files?.[0] ?? null;
}

async function saveResource() {
  saving.value = true;
  saveError.value = "";
  try {
    const newResource = await insertResource({
      tripId: tripId as string,
      name: resourceName.value,
      description: resourceDescription.value,
      link: resourceLink.value,
      file: resourceFile.value,
    });
    resources.value.push(newResource);
    addResourceModalOpen.value = false;
    resourceName.value = "";
    resourceDescription.value = "";
    resourceLink.value = "";
    resourceFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  } catch (error) {
    saveError.value =
      error instanceof Error ? error.message : t("errors.saveResource");
  } finally {
    saving.value = false;
  }
}
const filteredResources = computed(() => {
  return resources.value.filter((resource) =>
    resource.name.toLowerCase().includes(search.value.toLowerCase()),
  );
});

function openEditResourceModal(resourceId: string) {
  const resource =
    resources.value.find((resource) => resource.id === resourceId) ?? null;
  if (resource) {
    editResourceId.value = resource.id;
    editResourceName.value = resource.name;
    editResourceDescription.value = resource.description ?? "";
    editResourceLink.value = resource.link ?? "";
  }
  editResourceModalOpen.value = true;
}

const closeEditResourceModal = () => {
  editResourceModalOpen.value = false;
  editResourceName.value = "";
  editResourceDescription.value = "";
  editResourceLink.value = "";
};

const removeResource = async (resourceId: string) => {
  await deleteResource(resourceId);
  resources.value = resources.value.filter(
    (resource) => resource.id !== resourceId,
  );
};

async function saveEditedResource() {
  const updatedResource = await updateResource(editResourceId.value, {
    name: editResourceName.value,
    description: editResourceDescription.value,
    link: editResourceLink.value,
  });
  if (updatedResource) {
    resources.value = resources.value.map((resource) =>
      resource.id === updatedResource.id ? updatedResource : resource,
    );
    closeEditResourceModal();
  }
}
</script>

<template>
  <main
    class="min-h-screen w-full overflow-hidden bg-(--app-bg) flex flex-col py-2 md:py-4 px-4 md:px-8 pb-15 md:pb-0"
  >
    <div
      class="relative mt-4 flex flex-col w-full items-center justify-center gap-3 md:mt-30"
    >
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
            leadingIcon: 'size-5 text-(--ui-bg-elevated)/90',
          }"
        />
        <UModal
          :title="t('resources.new')"
          :ui="{
            title: 'text-(--ui-text-contrast) tracking-tight',
            content: ' bg-(--ui-text)',
            close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
          }"
          :open="addResourceModalOpen"
          @update:open="addResourceModalOpen = $event"
        >
          <UButton
            icon="i-heroicons-plus"
            :label="t('resources.new')"
            color="neutral"
            variant="subtle"
            class="w-fit rounded-full"
            @click="addResourceModalOpen = true"
            :ui="{ leadingIcon: 'size-3 md:size-4' }"
          >
            <span class="hidden md:inline">{{ t("resources.new") }}</span>
            <span class="inline md:hidden">{{ t("resources.short") }}</span>
          </UButton>

          <template #body>
            <UForm
              id="add-place-form"
              class="flex flex-col gap-3"
              :on-submit="saveResource"
            >
              <UFormField
                :label="t('common.name')"
                :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
              >
                <UInput
                  v-model="resourceName"
                  :placeholder="t('resources.namePlaceholder')"
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
                  v-model="resourceDescription"
                  :rows="2"
                  class="w-full"
                  :placeholder="t('resources.descriptionPlaceholder')"
                  :ui="{
                    base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
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
                    base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
                  }"
                />
              </UFormField>
              <UFormField
                :label="t('common.file')"
                :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
              >
                <div class="flex items-center gap-3">
                  <input
                    ref="fileInput"
                    type="file"
                    class="sr-only"
                    @change="onFileChange"
                  />
                  <UButton
                    type="button"
                    color="neutral"
                    variant="soft"
                    class="rounded-full"
                    @click="fileInput?.click()"
                  >
                    {{ t("common.chooseFile") }}
                  </UButton>
                  <span class="truncate text-sm text-(--ui-text-contrast)/80">
                    {{ resourceFile?.name || t("common.noFile") }}
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
              <UButton
                type="submit"
                form="add-place-form"
                class="rounded-full"
                :loading="saving"
              >
                {{ t("common.save") }}
              </UButton>
            </div>
          </template>
        </UModal>
      </div>

      <div class="w-full columns-1 gap-3 sm:columns-2 lg:columns-3">
        <article
          v-for="resource in filteredResources"
          :key="resource.id"
          class="mb-3 break-inside-avoid flex flex-col bg-(--resource-card-bg) p-3 rounded-md text-(--resource-card-text)"
        >
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-bold text-xl tracking-tighter">
              {{ resource.name }}
            </h2>
            <UDropdownMenu
              :items="[
                {
                  label: t('common.edit'),
                  icon: 'i-heroicons-pencil-square',

                  onSelect: () => openEditResourceModal(resource.id),
                },
                {
                  label: t('common.delete'),
                  icon: 'i-heroicons-trash',
                  color: 'error',
                  onSelect: () => removeResource(resource.id),
                },
              ]"
              :ui="{
                content: 'bg-(--ui-text) rounded-xl',
                item: 'text-(--ui-text-contrast) rounded-xl hover:bg-(--ui-text-contrast)/10',
                itemLabel: 'text-(--ui-text-contrast)',
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

          <p
            v-if="resource.description"
            class="text-(--resource-card-text)/70 tracking-tight"
          >
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
            class="text-(--resource-card-text)/70 text-xs mt-2 break-all hover:text-(--resource-card-text)/90"
            >{{ resource.link }}</a
          >
        </article>
      </div>
    </div>

    <UModal
      :title="t('resources.edit')"
      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: 'bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10',
      }"
      :open="editResourceModalOpen"
      @update:open="editResourceModalOpen = $event"
    >
      <template #body>
        <UForm
          id="edit-resource-form"
          class="flex flex-col gap-3"
          @submit="saveEditedResource()"
        >
          <UFormField
            :label="t('common.name')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editResourceName"
              :placeholder="t('resources.namePlaceholder')"
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
              v-model="editResourceDescription"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('common.link')"
            :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"
          >
            <UInput
              v-model="editResourceLink"
              class="w-full"
              :ui="{
                base: 'placeholder:text-(--ui-text-contrast) placeholder:opacity-60 text-(--ui-text-contrast)',
              }"
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton @click="closeEditResourceModal">{{
            t("common.cancel")
          }}</UButton>
          <UButton type="submit" form="edit-resource-form">
            {{ t("common.save") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>
