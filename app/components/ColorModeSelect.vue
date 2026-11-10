<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

defineOptions({ inheritAttrs: false });

const colorMode = useColorMode();
const { mode, modes } = useAppColorMode();

const items = Object.entries(modes).map(([value, label]) => ({
  label,
  value,
}));
</script>

<template>
  <ClientOnly v-if="!colorMode.forced">
    <USelect
      v-model="mode"
      :items="items"
      value-key="value"
      :content="{ position: 'popper', side: 'top', sideOffset: 12 }"
      :ui="{
        base: 'size-11 rounded-full justify-center p-0',
        value: 'text-center text-2xl',
        trailing: 'hidden',

        content: 'bg-transparent ring-0 shadow-none rounded-none',
        viewport: 'p-0',
        group: 'flex flex-col items-center gap-3 p-1',

        item: 'size-8 shrink-0 items-center justify-center rounded-full bg-white/60 backdrop-blur-xl ring-1 ring-black/10 p-0 before:rounded-full',
        itemWrapper: 'flex-none',
        itemLabel: 'text-lg leading-none overflow-visible',
        itemTrailing: 'hidden',
      }"
    />
  </ClientOnly>
</template>
