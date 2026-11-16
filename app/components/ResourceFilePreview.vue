<script setup lang="ts">
const props = defineProps<{
  filePath: string
  name: string
}>()

const { resourceFileUrl } = useTripResources()
const { t } = useI18n()
const fileUrl = computed(() => resourceFileUrl(props.filePath) ?? '')
const imageModalOpen = ref(false)

const basename = computed(
  () => props.filePath.split(/[?#]/)[0]?.split('/').pop() || t('common.fileFallback')
)

const filename = computed(() => {
  const name = basename.value.replace(/^[0-9a-f-]{36}-/i, '')

  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
})

const isImage = computed(() =>
  /\.(avif|gif|jpe?g|png|webp)$/i.test(filename.value)
)
</script>

<template>
  <img
    v-if="isImage"
    :src="fileUrl"
    :alt="name"
    class="mt-2 w-full rounded-md object-contain"
    loading="lazy"
    @click="imageModalOpen = true"
  >

  <a
    v-else
    :href="fileUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="mt-2 text-sm font-semibold underline break-all"
  >{{ filename }}</a>
  <UModal
    :open="imageModalOpen"
    :ui="{
      content: 'bg-white border-0 ring-0'
    }"
    @update:open="imageModalOpen = $event"
  >
    <template #content>
      <img
        :src="fileUrl"
        :alt="name"
        class="w-full rounded-md object-contain"
      >
    </template>
    <template #footer>
      <UButton @click="imageModalOpen = false">
        {{ t("common.close") }}
      </UButton>
    </template>
  </UModal>
</template>
