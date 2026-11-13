<script setup lang="ts">
import { instantLinkPreview, youtubeEmbedUrl } from "~/utils/linkPreview";

const props = defineProps<{
  url: string;
}>();

const embedUrl = computed(() => youtubeEmbedUrl(props.url));
const image = ref<string | null>(null);

watch(
  () => props.url,
  async (url) => {
    if (youtubeEmbedUrl(url)) {
      image.value = null;
      return;
    }

    const immediate = instantLinkPreview(url);
    if (immediate) {
      image.value = immediate;
      return;
    }

    image.value = null;
    try {
      const preview = await $fetch<{ image: string | null }>("/api/link-preview", {
        query: { url },
      });
      if (props.url === url) {
        image.value = preview.image;
      }
    } catch {
      if (props.url === url) {
        image.value = null;
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <iframe
    v-if="embedUrl"
    :src="embedUrl"
    title="Vídeo de YouTube"
    class="mt-2 aspect-video w-full rounded-md"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  />
  <a
    v-else-if="image"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    class="mt-2 block overflow-hidden rounded-md"
  >
    <img
      :src="image"
      alt=""
      class="h-36 w-full object-cover"
      loading="lazy"
    >
  </a>
</template>
