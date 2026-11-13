<script setup lang="ts">
import { useTripPlaces } from "~/composables/useTripPlaces";
import UColorModeSelect from "~/components/ColorModeSelect.vue";

const supabase = useSupabaseClient();
const localePath = useLocalePath();
const { loadPublicTrips, loadPersonalTrips, insertTrip } = useTripPlaces();
const publicTrips = ref<Trip[]>([]);
const personalTrips = ref<Trip[]>([]);
const showPassword = ref(false);
const newTripName = ref("");
const user = useSupabaseUser();

onMounted(async () => {
  // true stands for only open trips
  publicTrips.value = await loadPublicTrips();
  if (user.value) {
    personalTrips.value = await loadPersonalTrips();
  }
});

watch(user, async (newUser) => {
  if (newUser) {
    personalTrips.value = await loadPersonalTrips();
  }
});

const openTripDetails = (trip: Trip) => {
  navigateTo(localePath(`/trip/${trip.id}`));
};
const startNewTrip = async () => {
  try {
    const data = await insertTrip({
      name: newTripName.value,
    });
    navigateTo(
      localePath(`/trip/${(data as unknown as { id: string })?.id ?? ""}`),
    );
  } catch (error) {
    console.error(error);
  }
};

const loading = ref(false);
const email = ref("");
const password = ref("");

const handleLogin = async () => {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    navigateTo(localePath("/"));
  } catch (error) {
    alert((error as any).error_description || (error as any).message);
  } finally {
    loading.value = false;
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  navigateTo(localePath("/"));
};

const openOurStories = () => {
  window.open(
    "https://lauragonzalezcomalada.github.io/borradoresdeviaje/",
    "_blank",
  );
};
</script>
<template>
  <!--  bg-[url('/bg_image.jpg')] bg-cover bg-center  -->
  <div
    class="relative h-dvh w-full flex flex-col items-center justify-between py-8 px-[10vw]"
  >
    <div class="flex flex-col md:flex-row gap-4 items-center">
      <LocaleSwitch mobile-side="right" />
      <UColorModeSelect class="w-fit" mobile-side="right" />
      <div
        class="rounded-3xl border border-(--ui-border)/10 bg-white/40 py-3 px-6 w-fit backdrop-blur-2xl shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)]"
      >
        <div class="flex gap-10 items-center">
          <div
            @click="openOurStories()"
            class="text-lg font-bold tracking-tighter cursor-pointer hover:underline"
            key="our-stories"
          >
            {{ $t("nav.stories") }}
          </div>
          <div
            v-for="trip in publicTrips"
            :key="trip.id"
            class="text-lg font-bold tracking-tighter cursor-pointer hover:underline"
            @click="openTripDetails(trip)"
          >
            {{ trip.name }}
          </div>
        </div>
      </div>
      <div
        v-if="!user"
        class="rounded-full border border-(--ui-border)/10 bg-white/40 p-1.5 w-fit flex items-center justify-center backdrop-blur-2xl shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)]"
      >
        <UPopover
          :content="{
            align: 'start',
            side: 'bottom',
            sideOffset: 8,
          }"
        >
          <UButton
            icon="i-lucide-user"
            variant="link"
            class="text-(--ui-text) hover:text-(--ui-text-contrast)"
          />

          <template #content>
            <div class="p-4 bg-(--ui-text) rounded-md flex flex-col gap-2">
              <div class="text-(--ui-text-contrast)/90 font-semibold">
                {{ $t("auth.enter") }}
              </div>
              <UForm class="flex flex-col gap-2" @submit.prevent="handleLogin">
                <UFormField
                  :label="$t('common.email')"
                  :ui="{ label: 'text-(--ui-text-contrast)/90' }"
                >
                  <UInput
                    v-model="email"
                    type="email"
                    class="w-full text-(--ui-text-contrast)"
                    :placeholder="$t('common.emailPlaceholder')"
                  />
                </UFormField>
                <UFormField
                  :label="$t('common.password')"
                  :ui="{ label: 'text-(--ui-text-contrast)/90' }"
                >
                  <UInput
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full"
                    :placeholder="$t('common.passwordPlaceholder')"
                  >
                    <template #trailing>
                      <UButton
                        type="button"
                        variant="link"
                        :icon="
                          showPassword ? 'i-lucide-eye' : 'i-lucide-eye-off'
                        "
                        @click="showPassword = !showPassword"
                      /> </template
                  ></UInput>
                </UFormField>

                <UButton
                  type="submit"
                  class="w-fit mt-2 bg-(--ui-bg-elevated) hover:bg-(--ui-text-contrast)/80"
                  >{{ $t("auth.confirm") }}</UButton
                >
                <USeparator />
                <div class="text-xs text-(--ui-text-contrast)/90 mt-2">
                  <span class="italic"> {{ $t("auth.noAccount") }} </span>
                  <NuxtLink
                    :to="$localePath('/signup')"
                    class="text-(--ui-text-contrast)/90 font-semibold"
                    >{{ $t("auth.signupNow") }}</NuxtLink
                  >
                </div>
              </UForm>
            </div>
          </template>
        </UPopover>
      </div>
      <div
        v-else
        class="rounded-full bg-(--ui-text) p-2 w-10 h-10 flex items-center justify-center"
      >
        <UPopover
          :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 8,
          }"
        >
          <UButton
            :label="`${user?.email?.charAt(0).toUpperCase()}`"
            class="text-(--ui-text-contrast)"
            variant="link"
          />
          <template #content>
            <div class="px-2 bg-(--ui-text) rounded-md flex flex-col gap-2">
              <UButton
                :label="$t('auth.comeBack')"
                variant="link"
                class="text-(--ui-text-contrast) hover:text-(--ui-text-contrast)"
                @click="handleLogout"
              />
            </div>
          </template>
        </UPopover>
      </div>

      <div
        v-if="user"
        class="relative w-max min-w-0 max-w-[90vw] md:max-w-[50vw]"
      >
        <div
          class="absolute bottom-full left-2 mb-0.5 whitespace-nowrap text-xs font-medium italic tracking-tighter"
        >
          {{ $t("home.yourTrips") }}
        </div>
        <div
          class="w-full rounded-3xl border border-(--ui-border)/10 bg-white/40 py-3 px-6 backdrop-blur-2xl shadow-[0_8px_32px_color-mix(in_srgb,var(--glass-shadow)_24%,transparent)]"
        >
          <div class="flex w-full items-center gap-4">
            <div
              class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div
                v-for="trip in personalTrips"
                :key="trip.id"
                class="whitespace-nowrap text-lg font-bold tracking-tighter cursor-pointer hover:underline"
                @click="openTripDetails(trip)"
              >
                {{ trip.name }}
              </div>
            </div>
            <USeparator orientation="vertical" class="h-4 shrink-0" />
            <UPopover
              class="shrink-0"
              :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
            >
              <UButton
                variant="link"
                class="whitespace-nowrap px-0 py-0 text-lg font-semibold tracking-tighter text-(--ui-text)/70 hover:text-(--ui-text-contrast)"
                >{{ $t("home.newTrip") }}</UButton
              >
              <template #content>
                <div class="p-4 bg-(--ui-text) rounded-md flex flex-col gap-2">
                  <UFormField
                    :label="$t('home.tripNameQuestion')"
                    :ui="{
                      label:
                        'text-(--ui-text-contrast)/90 tracking-tighter font-semibold italic',
                    }"
                  >
                    <UInput
                      v-model="newTripName"
                      type="text"
                      class="w-full"
                      :placeholder="$t('home.tripNamePlaceholder')"
                    />
                  </UFormField>
                  <USeparator class="text-(--ui-text-contrast)/90" />
                  <UButton
                    variant="solid"
                    class="w-fit text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/80 font-semibold tracking-tighter hover:text-(--ui-bg-muted)"
                    @click="startNewTrip"
                    :disabled="newTripName == null || newTripName == ''"
                    >{{ $t("home.createTrip") }}</UButton
                  >
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </div>
    </div>

    <h1
      class="pb-10 md:pb-0 whitespace-nowrap tracking-tighter text-[12vw] font-bold leading-none expand text-shadow-sm text-shadow-[color:var(--glass-shadow)]"
    >
      {{ $t("app.wordmark") }}
    </h1>
  </div>
</template>

<style scoped>
.expand {
  animation: expand 500ms ease-in-out;
}

@keyframes expand {
  from {
    font-size: 0;
  }
  to {
    font-size: 12vw;
  }
}
</style>
