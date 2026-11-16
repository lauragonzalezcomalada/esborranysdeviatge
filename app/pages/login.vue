<script setup>
const supabase = useSupabaseClient()
const localePath = useLocalePath()

const loading = ref(false)
const email = ref('')
const password = ref('')
const handleLogin = async () => {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (error) throw error
    navigateTo(localePath('/'))
  } catch (error) {
    alert(error.error_description || error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form
    class="row flex-center flex"
    @submit.prevent="handleLogin"
  >
    <div class="col-6 form-widget">
      <h1 class="text-2xl font-bold">
        {{ $t("auth.login") }}
      </h1>
      <UInput
        v-model="email"
        type="email"
        :placeholder="$t('common.emailPlaceholder')"
      />
      <UInput
        v-model="password"
        type="password"
        :placeholder="$t('common.passwordPlaceholder')"
      />
      <UButton
        :loading="loading"
        @click="handleLogin"
      >
        {{ $t("auth.login") }}
      </UButton>
    </div>
  </form>
</template>
