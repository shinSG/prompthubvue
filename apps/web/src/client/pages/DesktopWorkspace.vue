<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { installDesktopBridge } from '../desktop/install-bridge';

const { t } = useI18n();
const { user, registrationAllowed, isInitialized, logout } = useAuth();

const reactRootContainer = ref<HTMLDivElement | null>(null);
let reactRoot: { unmount: () => void } | null = null;

function getOrCreateBrowserDeviceId(): string {
  const storageKey = 'prompthub-web-device-id';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `browser-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, nextId);
  return nextId;
}

function detectClientBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Google Chrome';
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return 'Safari';
  if (/firefox\//i.test(userAgent)) return 'Firefox';
  return 'Browser';
}

function detectClientPlatform(userAgent: string): string {
  if (/mac os x/i.test(userAgent)) return 'macOS';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/android/i.test(userAgent)) return 'Android';
  if (/(iphone|ipad|ios)/i.test(userAgent)) return 'iOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Unknown OS';
}

async function mountReactApp() {
  if (!reactRootContainer.value) return;

  const [
    { createRoot },
    { default: DesktopApp },
    { ToastProvider },
  ] = await Promise.all([
    import('react-dom/client'),
    import('@desktop-renderer-app'),
    import('@desktop-toast-provider'),
  ]);

  const React = await import('react');
  const root = createRoot(reactRootContainer.value);
  reactRoot = root;

  root.render(
    React.createElement(ToastProvider, null, React.createElement(DesktopApp))
  );
}

onMounted(() => {
  installDesktopBridge();
  void mountReactApp();

  // Device heartbeat
  const sendHeartbeat = async () => {
    if (!user.value?.username) return;
    const userAgent = navigator.userAgent;
    try {
      await fetch('/api/devices/heartbeat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: getOrCreateBrowserDeviceId(),
          type: 'browser',
          name: detectClientBrowser(userAgent),
          platform: detectClientPlatform(userAgent),
          clientVersion: 'self-hosted-web',
          userAgent,
        }),
      });
    } catch (error) {
      console.warn('Failed to register browser device heartbeat:', error);
    }
  };

  void sendHeartbeat();

  // Set web context globals
  Reflect.set(window, '__PROMPTHUB_WEB_CONTEXT__', {
    mode: 'self-hosted',
    origin: window.location.origin,
    username: user.value?.username,
    registrationAllowed: registrationAllowed.value,
    initialized: isInitialized.value,
  });

  Reflect.set(window, '__PROMPTHUB_WEB_LOGOUT__', async () => {
    await logout();
    window.location.assign('/login');
  });

  window.dispatchEvent(new CustomEvent('prompthub:web-context-changed'));
});

watch(
  [isInitialized, registrationAllowed, () => user.value?.username],
  () => {
    Reflect.set(window, '__PROMPTHUB_WEB_CONTEXT__', {
      mode: 'self-hosted',
      origin: window.location.origin,
      username: user.value?.username,
      registrationAllowed: registrationAllowed.value,
      initialized: isInitialized.value,
    });
    window.dispatchEvent(new CustomEvent('prompthub:web-context-changed'));
  }
);

onUnmounted(() => {
  reactRoot?.unmount();
});
</script>

<template>
  <div ref="reactRootContainer" />
</template>
