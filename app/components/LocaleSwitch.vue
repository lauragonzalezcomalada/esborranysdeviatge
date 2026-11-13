<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    mobileSide?: "top" | "right" | "bottom" | "left";
  }>(),
  { mobileSide: "bottom" },
);

const { locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const isMobile = useMediaQuery("(max-width: 767px)");

const items = computed(() =>
  locales.value.map((item) => {
    const code = typeof item === "string" ? item : item.code;
    return {
      label: code.toUpperCase(),
      value: code,
    };
  }),
);

const selected = computed({
  get: () => locale.value,
  set: (code: string) => {
    if (code && code !== locale.value) {
      navigateTo(switchLocalePath(code as "es" | "en" | "ca"));
    }
  },
});

const menuSide = computed(() => (isMobile.value ? props.mobileSide : "top"));
const menuAlign = computed(() =>
  menuSide.value === "right" || menuSide.value === "left" ? "end" : "center",
);

const ui = computed(() => ({
  base: "size-8 shrink-0 justify-center overflow-visible rounded-full p-0 md:size-9",
  value:
    "overflow-visible text-center text-[0.65rem] font-bold leading-none tracking-tight md:text-xs",
  trailing: "hidden",
  content:
    "z-50 w-max! max-h-none! overflow-visible! rounded-none bg-transparent p-1 shadow-none ring-0",
  viewport: "overflow-visible! p-0",
  group:
    menuSide.value === "right" || menuSide.value === "left"
      ? "flex flex-row items-center gap-2 overflow-visible p-1"
      : "flex flex-col items-center gap-2 overflow-visible p-1 md:gap-3",
  item: "size-8 shrink-0 items-center justify-center overflow-visible rounded-full p-0 ring ring-(--ui-text) before:hidden hover:bg-(--glass-shadow)",
  itemWrapper: "flex-none overflow-visible",
  itemLabel:
    "overflow-visible text-[0.7rem] font-bold leading-none tracking-tight whitespace-normal",
  itemTrailing: "hidden",
}));
</script>

<template>
  <USelect
    v-model="selected"
    :items="items"
    value-key="value"
    :aria-label="$t('nav.language')"
    :content="{
      position: 'popper',
      side: menuSide,
      align: menuAlign,
      sideOffset: 8,
      collisionPadding: 12,
    }"
    :ui="ui"
  />
</template>
