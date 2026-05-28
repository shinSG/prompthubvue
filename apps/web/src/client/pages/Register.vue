<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const { register, isAuthenticated } = useAuth();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref<string | null>(null);

async function handleSubmit(e: Event) {
  e.preventDefault();
  error.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.setupPasswordMismatch');
    return;
  }

  try {
    await register({ username: username.value, password: password.value });
    router.replace('/');
  } catch (registerError: unknown) {
    if (registerError instanceof Error && registerError.message) {
      error.value = registerError.message;
    } else {
      error.value = t('auth.registerError');
    }
  }
}
</script>

<template>
  <div v-if="isAuthenticated" />
  <div v-else class="login-container prompthub-web-auth">
    <div class="login-card rounded-[28px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_32px_90px_rgba(15,23,42,0.10)] backdrop-blur">
      <h2 class="login-title text-3xl font-semibold text-slate-900">
        {{ t('auth.registerTitle') }}
      </h2>
      <p class="setup-hint">{{ t('auth.needAccount') }}</p>

      <div v-if="error" class="login-error">{{ error }}</div>

      <form @submit="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="register-username" class="text-sm font-semibold text-slate-700">
            {{ t('auth.username') }}
          </label>
          <input
            id="register-username"
            v-model="username"
            type="text"
            required
            autofocus
            class="web-auth-input"
          />
        </div>

        <div class="form-group">
          <label for="register-password" class="text-sm font-semibold text-slate-700">
            {{ t('auth.password') }}
          </label>
          <input
            id="register-password"
            v-model="password"
            type="password"
            required
            class="web-auth-input"
          />
        </div>

        <div class="form-group">
          <label for="register-confirm-password" class="text-sm font-semibold text-slate-700">
            {{ t('auth.confirmPassword') }}
          </label>
          <input
            id="register-confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            class="web-auth-input"
          />
        </div>

        <button type="submit" class="login-submit web-auth-submit">
          <span class="text-white">{{ t('auth.register') }}</span>
        </button>
      </form>

      <div class="auth-inline-actions">
        <router-link to="/login" class="auth-link-button auth-link-button-block">
          {{ t('auth.signIn') }}
        </router-link>
      </div>
    </div>
  </div>
</template>
