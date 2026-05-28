<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { login, isAuthenticated, isBootstrapLoading, isInitialized } = useAuth();

const username = ref('');
const password = ref('');
const error = ref<string | null>(null);

async function handleSubmit(e: Event) {
  e.preventDefault();
  error.value = null;
  try {
    await login({ username: username.value, password: password.value });
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message || t('auth.loginError');
    } else {
      error.value = t('auth.loginError');
    }
  }
}
</script>

<template>
  <div v-if="isBootstrapLoading" class="loading-screen">{{ t('dashboard.loading') }}</div>
  <div v-else-if="!isInitialized" />
  <div v-else-if="isAuthenticated" />
  <div v-else class="login-container prompthub-web-auth">
    <div class="login-card rounded-[28px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_32px_90px_rgba(15,23,42,0.10)] backdrop-blur">
      <h2 class="login-title text-3xl font-semibold text-slate-900">
        {{ t('auth.loginTitle') }}
      </h2>
      <p class="setup-hint">
        {{ t('auth.loginDescription') }}
      </p>

      <div v-if="error" class="login-error">{{ error }}</div>

      <form @submit="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username" class="text-sm font-semibold text-slate-700">
            {{ t('auth.username') }}
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="web-auth-input"
          />
        </div>

        <div class="form-group">
          <label for="password" class="text-sm font-semibold text-slate-700">
            {{ t('auth.password') }}
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="web-auth-input"
          />
        </div>

        <button type="submit" class="login-submit web-auth-submit">
          <span class="text-white">{{ t('auth.signIn') }}</span>
        </button>
      </form>

      <div class="auth-inline-actions auth-inline-actions-column">
        <span class="setup-hint">{{ t('auth.needAccount') }}</span>
        <router-link to="/register" class="auth-link-button auth-link-button-block">
          {{ t('auth.register') }}
        </router-link>
      </div>
    </div>
  </div>
</template>
