<script setup lang="ts">
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
      aria-label="Choose color theme"
      :content="{ position: 'popper', side: 'top', sideOffset: 8 }"
      :ui="{
        base: 'size-8 md:size-11 shrink-0 rounded-full justify-center p-0',
        value: 'text-center text-base md:text-2xl leading-none',
        trailing: 'hidden',

        content: 'min-w-0 bg-transparent ring-0 shadow-none rounded-none',
        viewport: 'p-0',
        group: 'flex flex-col items-center gap-2 md:gap-3 p-1',

        item: 'size-8 md:size-10 shrink-0 items-center justify-center rounded-full bg-white/60 backdrop-blur-xl ring-1 ring-black/10 p-0 before:rounded-full',
        itemWrapper: 'flex-none',
        itemLabel: 'text-base md:text-xl leading-none overflow-visible',
        itemTrailing: 'hidden',
      }"
    />
  </ClientOnly>
</template>
