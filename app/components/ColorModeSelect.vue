<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    mobileSide?: "top" | "right" | "bottom" | "left";
  }>(),
  { mobileSide: "bottom" },
);

const colorMode = useColorMode();
const { mode, modes } = useAppColorMode();
const isMobile = useMediaQuery("(max-width: 767px)");

const items = Object.entries(modes).map(([value, label]) => ({
  label,
  value,
}));

const menuSide = computed(() => (isMobile.value ? props.mobileSide : "top"));
const menuAlign = computed(() =>
  menuSide.value === "right" || menuSide.value === "left" ? "end" : "center",
);

const ui = computed(() => ({
  base: "size-8 shrink-0 justify-center overflow-visible rounded-full p-0 md:size-11",
  value: "overflow-visible text-center text-base leading-none md:text-2xl",
  trailing: "hidden",
  content:
    "z-50 w-max! max-h-none! overflow-visible! rounded-none bg-transparent p-1 shadow-none ring-0",
  viewport: "overflow-visible! p-0",
  group:
    menuSide.value === "right" || menuSide.value === "left"
      ? "flex flex-row items-center gap-2 overflow-visible p-1"
      : "flex flex-col items-center gap-2 overflow-visible p-1 md:gap-3",
  item: "size-10 shrink-0 items-center justify-center overflow-visible rounded-full bg-white p-0 ring-2 ring-black/35 before:hidden",
  itemWrapper: "flex-none overflow-visible",
  itemLabel: "overflow-visible text-xl leading-none whitespace-normal",
  itemTrailing: "hidden",
}));
</script>

<template>
  <ClientOnly v-if="!colorMode.forced">
    <USelect
      v-model="mode"
      :items="items"
      value-key="value"
      aria-label="Choose color theme"
      :content="{
        position: 'popper',
        side: menuSide,
        align: menuAlign,
        sideOffset: 8,
        collisionPadding: 12,
      }"
      :ui="ui"
    />
  </ClientOnly>
</template>
