<script setup lang="ts">
const supabase = useSupabaseClient();

const loading = ref(false);
const email = ref("");
const password = ref("");
const handleSignup = async () => {
  console.log("handleSignup", email.value, password.value);
  try {
    loading.value = true;
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    navigateTo("/");
  } catch (error) {
    alert((error as any).error_description || (error as any).message);
    console.error(error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="h-screen w-full flex items-center justify-center overflow-visible"
  >
    <div
      class="flex items-center justify-center w-[120vw] md:w-[40vw] aspect-square shrink-0 rounded-full bg-(--ui-text) text-(--ui-text-contrast)"
    >
      <div class="flex flex-col gap-8 p-20">
        <span class="text-3xl md:text-4xl font-bold tracking-tight">
          Regístrate para diseñar tus propias historias! 🚀
        </span>

        <UForm class="flex flex-col gap-2" @submit.prevent="handleSignup">
          <UFormField
            label="Email"
            :ui="{ label: 'text-(--ui-text-contrast) text-lg tracking-tight' }"
          >
            <UInput
              v-model="email"
              type="email"
              placeholder="Your email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Contraseña"
            :ui="{ label: 'text-(--ui-text-contrast) text-lg tracking-tight' }"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="Your password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            :disabled="
              password == null || password == '' || email == null || email == ''
            "
            class="w-fit mx-auto mt-8 bg-(--app-fg) text-(--ui-text-contrast) text-2xl font-semibold tracking-tighter hover:bg-(--ui-text-contrast)/80 rounded-full px-10"
            >Mandar mail de confirmación</UButton
          >
        </UForm>
      </div>
    </div>
  </div>
</template>
