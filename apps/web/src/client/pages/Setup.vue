<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const { register, isAuthenticated, isBootstrapLoading, isInitialized } = useAuth();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref<string | null>(null);

async function handleSubmit(event: Event) {
  event.preventDefault();
  error.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.setupPasswordMismatch');
    return;
  }

  try {
    await register({ username: username.value, password: password.value });
    router.replace('/');
  } catch (setupError: unknown) {
    if (setupError instanceof Error && setupError.message) {
      error.value = setupError.message;
    } else {
      error.value = t('auth.setupError');
    }
  }
}
</script>

<template>
  <div v-if="isBootstrapLoading" class="loading-screen">{{ t('dashboard.loading') }}</div>
  <div v-else-if="isInitialized" />
  <div v-else class="login-container prompthub-web-auth">
    <div class="login-card setup-card rounded-[32px] border border-slate-200/80 bg-white/95 p-9 shadow-[0_32px_90px_rgba(15,23,42,0.10)] backdrop-blur">
      <div class="setup-badge">{{ t('auth.setupBadge') }}</div>
      <h1 class="login-title text-3xl font-semibold text-slate-900">
        {{ t('auth.setupTitle') }}
      </h1>
      <p class="setup-lead">{{ t('auth.setupDescription') }}</p>
      <p class="setup-hint">{{ t('auth.setupHint') }}</p>

      <div v-if="error" class="login-error">{{ error }}</div>

      <form @submit="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="setup-username" class="text-sm font-semibold text-slate-700">
            {{ t('auth.username') }}
          </label>
          <input
            id="setup-username"
            v-model="username"
            type="text"
            required
            autofocus
            class="web-auth-input"
          />
        </div>

        <div class="form-group">
          <label for="setup-password" class="text-sm font-semibold text-slate-700">
            {{ t('auth.password') }}
          </label>
          <input
            id="setup-password"
            v-model="password"
            type="password"
            required
            class="web-auth-input"
          />
        </div>

        <div class="form-group">
          <label for="setup-confirm-password" class="text-sm font-semibold text-slate-700">
            {{ t('auth.confirmPassword') }}
          </label>
          <input
            id="setup-confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            class="web-auth-input"
          />
        </div>

        <button type="submit" class="login-submit web-auth-submit">
          <span class="text-white">{{ t('auth.completeSetup') }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
