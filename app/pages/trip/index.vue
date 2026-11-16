<template>
  <main
    class="flex h-dvh items-center justify-center bg-[var(--app-bg)] px-6 text-center"
  >
    <div class="max-w-md">
      <p class="text-lg text-amber-200">
        {{ $t("trip.missing") }}
      </p>
      <NuxtLink
        :to="$localePath('/')"
        class="mt-6 inline-block text-sm text-white/70 underline"
      >
        {{ $t("trip.back") }}
      </NuxtLink>
    </div>
  </main>
</template>
