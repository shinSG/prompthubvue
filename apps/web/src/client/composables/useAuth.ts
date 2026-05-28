import { ref, computed, watch } from 'vue';
import {
  getBootstrapStatus,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
  register as apiRegister,
  type LoginCredentials,
} from '../api/auth';
import {
  AUTH_SESSION_EVENT,
  clearStoredAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeAuthSession,
} from '../api/auth-session';

interface User {
  id: string;
  username: string;
  role?: 'admin' | 'user';
}

const user = ref<User | null>(null);
const token = ref<string | null>(getStoredAccessToken());
const refreshToken = ref<string | null>(getStoredRefreshToken());
const isLoading = ref(true);
const isBootstrapLoading = ref(true);
const isInitialized = ref(true);
const registrationAllowed = ref(false);
let initialized = false;
let sessionLoading = false;
let authActionInProgress = false;

function clearSession(): void {
  token.value = null;
  refreshToken.value = null;
  user.value = null;
  clearStoredAuthSession();
}

function onAuthSessionChanged(): void {
  token.value = getStoredAccessToken();
  refreshToken.value = getStoredRefreshToken();
}

async function loadSession(): Promise<void> {
  if (sessionLoading) return;
  sessionLoading = true;
  try {
    const data = await getMe();
    user.value = data.data;
  } catch {
    // Only attempt refresh if we have a refresh token
    if (refreshToken.value) {
      try {
        const refreshed = await apiRefresh(refreshToken.value);
        token.value = refreshed.data.accessToken;
        refreshToken.value = refreshed.data.refreshToken;
        user.value = refreshed.data.user;
        storeAuthSession(refreshed.data.accessToken, refreshed.data.refreshToken);
      } catch {
        clearSession();
      }
    } else {
      clearSession();
    }
  } finally {
    sessionLoading = false;
    isLoading.value = false;
  }
}

export function useAuth() {
  if (!initialized) {
    initialized = true;

    window.addEventListener(AUTH_SESSION_EVENT, onAuthSessionChanged);

    // Load bootstrap status
    (async () => {
      try {
        const status = await getBootstrapStatus();
        isInitialized.value = status.data.initialized;
        registrationAllowed.value = status.data.registrationAllowed;
      } catch {
        isInitialized.value = true;
        registrationAllowed.value = false;
      } finally {
        isBootstrapLoading.value = false;
      }
    })();

    // Initial session load
    void loadSession();

    // Watch for external token/refreshToken changes (e.g. from auth-session event) and reload session
    watch(
      [token, refreshToken],
      ([newToken, newRefreshToken], [oldToken, oldRefreshToken]) => {
        if (sessionLoading || authActionInProgress) return; // Skip if triggered internally
        if (newToken !== oldToken || newRefreshToken !== oldRefreshToken) {
          void loadSession();
        }
      },
    );
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    authActionInProgress = true;
    try {
      const res = await apiLogin(credentials);
      token.value = res.data.accessToken;
      refreshToken.value = res.data.refreshToken;
      user.value = res.data.user;
      storeAuthSession(res.data.accessToken, res.data.refreshToken);
    } finally {
      authActionInProgress = false;
    }
  }

  async function register(credentials: LoginCredentials): Promise<void> {
    authActionInProgress = true;
    try {
      const res = await apiRegister(credentials);
      token.value = res.data.accessToken;
      refreshToken.value = res.data.refreshToken;
      user.value = res.data.user;
      storeAuthSession(res.data.accessToken, res.data.refreshToken);
      await refreshBootstrap();
    } finally {
      authActionInProgress = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    clearSession();
  }

  async function refreshBootstrap(): Promise<void> {
    isBootstrapLoading.value = true;
    try {
      const status = await getBootstrapStatus();
      isInitialized.value = status.data.initialized;
      registrationAllowed.value = status.data.registrationAllowed;
    } catch {
      isInitialized.value = true;
      registrationAllowed.value = false;
    } finally {
      isBootstrapLoading.value = false;
    }
  }

  return {
    user,
    token,
    isAuthenticated: computed(() => !!user.value),
    isLoading,
    isBootstrapLoading,
    isInitialized,
    registrationAllowed,
    login,
    register,
    logout,
    refreshBootstrap,
  };
}
