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
    <UCard class="bg-(--app-bg)">
      <div class="flex flex-col gap-8">
        <span class="text-(--ui-text-contrast) font-bold">
          Sign up to design your own stories! 🚀
        </span>

        <UForm class="flex flex-col gap-2" @submit.prevent="handleSignup">
          <UFormField label="Email">
            <UInput
              v-model="email"
              type="email"
              placeholder="Your email"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="Your password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            class="w-fit mt-8 bg-(--ui-text) text-(--ui-text-contrast) hover:bg-(--ui-text-contrast)/80"
            >Sign up</UButton
          >
        </UForm>
      </div>
    </UCard>
  </div>
</template>
