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
  <div class="h-screen w-full flex items-center justify-center">
    <div
      class="flex items-center justify-center w-[40vw] h-[40vw] rounded-full bg-(--ui-text) text-(--ui-text-contrast)"
    >
      <div class="flex flex-col gap-8 p-20">
        <span class="text-4xl font-bold tracking-tight">
          Sign up to design your own stories! 🚀
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
            label="Password"
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
            class="w-fit mx-auto mt-8 bg-(--app-bg) text-(--ui-text-contrast) text-2xl font-semibold tracking-tighter hover:bg-(--ui-text-contrast)/80 rounded-full px-10"
            >Sign up</UButton
          >
        </UForm>
      </div>
    </div>
  </div>
</template>
