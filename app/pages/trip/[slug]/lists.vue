<script setup lang="ts">
import type { TripList } from "~/composables/useTripLists";

definePageMeta({
  layout: "trip",
});

const route = useRoute();
const tripId = route.params.slug as string;
const { t } = useI18n();
const {
  user,
  loadLists,
  insertList,
  insertItem,
  updateItemSelected,
  deleteList,
  deleteItem,
} = useTripLists();

const lists = ref<TripList[]>([]);
const search = ref("");
const loadError = ref("");

const listModalOpen = ref(false);
const listSaving = ref(false);
const listError = ref("");
const listForm = reactive({
  name: "",
  description: "",
});

const itemModalOpen = ref(false);
const itemSaving = ref(false);
const itemError = ref("");
const itemName = ref("");
const activeListId = ref<string | null>(null);

function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}

const filteredLists = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return lists.value;

  return lists.value.filter(
    (list) =>
      list.name.toLowerCase().includes(query) ||
      (list.description ?? "").toLowerCase().includes(query) ||
      list.list_items.some((item) => item.name.toLowerCase().includes(query)),
  );
});

onMounted(async () => {
  try {
    lists.value = await loadLists(tripId);
  } catch (error) {
    loadError.value = errorText(error, t("lists.loadError"));
  }
});

function openListModal() {
  listForm.name = "";
  listForm.description = "";
  listError.value = "";
  listModalOpen.value = true;
}

async function saveList() {
  listSaving.value = true;
  listError.value = "";

  try {
    const list = await insertList({
      tripId,
      name: listForm.name,
      description: listForm.description,
    });
    lists.value.push({ ...list, list_items: list.list_items ?? [] });
    listModalOpen.value = false;
  } catch (error) {
    listError.value = errorText(error, t("lists.saveError"));
  } finally {
    listSaving.value = false;
  }
}

function openItemModal(listId: string) {
  activeListId.value = listId;
  itemName.value = "";
  itemError.value = "";
  itemModalOpen.value = true;
}

async function saveItem(andAnother = false) {
  if (!activeListId.value || !itemName.value.trim()) return;

  itemSaving.value = true;
  itemError.value = "";

  try {
    const item = await insertItem({
      listId: activeListId.value,
      name: itemName.value,
    });
    const list = lists.value.find((entry) => entry.id === activeListId.value);
    list?.list_items.push(item);
    itemName.value = "";

    if (!andAnother) {
      itemModalOpen.value = false;
    }
  } catch (error) {
    itemError.value = errorText(error, t("lists.saveError"));
  } finally {
    itemSaving.value = false;
  }
}

async function toggleItem(listId: string, itemId: string, selected: boolean) {
  const list = lists.value.find((entry) => entry.id === listId);
  const item = list?.list_items.find((entry) => entry.id === itemId);
  if (!item || !user.value) return;

  const previous = item.selected;
  item.selected = selected;

  try {
    await updateItemSelected(itemId, selected);
  } catch (error) {
    item.selected = previous;
    loadError.value = errorText(error, t("lists.saveError"));
  }
}

async function removeList(id: string) {
  await deleteList(id);
  lists.value = lists.value.filter((list) => list.id !== id);
}

async function removeItem(listId: string, itemId: string) {
  await deleteItem(itemId);
  const list = lists.value.find((entry) => entry.id === listId);
  if (list) {
    list.list_items = list.list_items.filter((item) => item.id !== itemId);
  }
}
</script>

<template>
  <main
    class="min-h-screen w-full overflow-hidden bg-(--app-bg) flex flex-col py-2 md:py-4 px-4 md:px-8 pb-15 md:pb-5"
  >
    <div
      class="relative mt-4 flex w-[50vw] ml-auto items-center justify-end gap-4 md:mt-24 "
    >
      <!--        class="flex h-full min-h-0 flex-col gap-4 md:absolute md:inset-0 md:flex-row md:items-center md:justify-between bg-red-200"
-->

      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('lists.search')"
        class="w-full md:max-w-sm"
        :ui="{
            base: 'rounded-full border-2 border-(--ui-bg-elevated) py-2 ps-11 pe-4 text-(--ui-bg-elevated) placeholder:text-(--ui-bg-elevated)/90 ring-0 focus-visible:ring-2 focus-visible:ring-(--ui-text)/30 focus-visible:bg-(--ui-text)/80 hover:bg-(--ui-text)/80',
            leadingIcon: 'size-5 text-(--ui-bg-elevated)/90'
          }"
      />
      <UButton
        class="rounded-full"
        icon="i-lucide-plus"
        :label="t('lists.new')"
        @click="openListModal"
      />

      <p v-if="loadError" role="alert" class="text-sm text-red-500">
        {{ loadError }}
      </p>
    </div>

    <div v-if="filteredLists.length" class=" mt-4 columns-1 md:columns-2 ">
      <article
        v-for="list in filteredLists"
        :key="list.id"
        class="mb-4 flex break-inside-avoid flex-col gap-4 rounded-3xl bg-(--resource-card-bg) p-5 text-(--resource-card-text)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-xl font-black tracking-tight">
              {{ list.name }}
            </h2>
            <p v-if="list.description" class="mt-1 text-sm opacity-80">
              {{ list.description }}
            </p>
          </div>

          <UButton
            v-if="user"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            :aria-label="t('common.delete')"
            @click="removeList(list.id)"
          />
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="item in list.list_items"
            :key="item.id"
            class="flex items-center gap-2"
          >
            <UCheckbox
              :model-value="item.selected"
              :disabled="!user"
              @update:model-value="
                toggleItem(list.id, item.id, Boolean($event))
              "
            />
            <span
              class="min-w-0 flex-1 text-sm font-semibold"
              :class="item.selected ? 'line-through opacity-60' : ''"
            >
              {{ item.name }}
            </span>
            <UButton
              v-if="user"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('common.delete')"
              @click="removeItem(list.id, item.id)"
            />
          </li>
        </ul>

        <p v-if="!list.list_items.length" class="text-sm opacity-70">
          {{ t("lists.noItems") }}
        </p>

        <UButton
          class="rounded-full self-start"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :label="t('lists.addItem')"
          @click="openItemModal(list.id)"
        />
      </article>
    </div>

    <p
      v-else-if="!loadError"
      class="text-sm  h-full flex-1 flex flex-col gap-2 items-center justify-center"
    >
    <UIcon
            name="i-lucide-face-slightly-frowning"
            class="size-6"
          />
      <p >
        {{ search ? t("lists.noResults") : t("lists.empty") }}
      </p>
    </p>

    <UModal
      v-model:open="listModalOpen"
      :title="t('lists.new')"
      :dismissible="!listSaving"
      :close="!listSaving"

      :ui="{
        title: 'text-(--ui-text-contrast) tracking-tight',
        content: ' bg-(--ui-text)',
        close: 'text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/10'
      }"

    >
      <template #body>
        <UForm
          id="new-list-form"
          :state="listForm"
          class="flex flex-col gap-3"
          @submit="saveList"
        >
          <UFormField :label="t('common.name')" name="name" :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }">
            <UInput v-model="listForm.name" required class="w-full" />
          </UFormField>
          <UFormField :label="t('common.description')" name="description" :ui="{ label: 'font-semibold text-(--ui-text-contrast)' }"  >
            <UTextarea v-model="listForm.description" class="w-full" />
          </UFormField>
          <p v-if="listError" role="alert" class="text-sm text-red-500">
            {{ listError }}
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
            :disabled="listSaving"
            @click="listModalOpen = false"
          />
          <UButton
            class="rounded-full"
            type="submit"
            form="new-list-form"
            :label="t('common.save')"
            :loading="listSaving"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="itemModalOpen"
      :title="t('lists.addItem')"
      :dismissible="!itemSaving"
      :close="!itemSaving"
    >
      <template #body>
        <UForm
          id="new-item-form"
          :state="{ name: itemName }"
          class="flex flex-col gap-3"
          @submit="saveItem(false)"
        >
          <UFormField :label="t('common.name')" name="name">
            <UInput v-model="itemName" required class="w-full" />
          </UFormField>
          <p v-if="itemError" role="alert" class="text-sm text-red-500">
            {{ itemError }}
          </p>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton
            class="rounded-full"
            :label="t('common.cancel')"
            color="neutral"
            variant="subtle"
            :disabled="itemSaving"
            @click="itemModalOpen = false"
          />
          <UButton
            class="rounded-full"
            type="submit"
            form="new-item-form"
            :label="t('common.save')"
            :loading="itemSaving"
          />
          <UButton
            class="rounded-full"
            :label="t('lists.saveAndAdd')"
            :loading="itemSaving"
            @click="saveItem(true)"
          />
        </div>
      </template>
    </UModal>
  </main>
</template>
