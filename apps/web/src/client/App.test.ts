import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../composables/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../composables/useAuth';

const authState = {
  isAuthenticated: true,
  isLoading: false,
  isBootstrapLoading: false,
  isInitialized: true,
  registrationAllowed: true,
  refreshBootstrap: vi.fn(),
  user: null,
  token: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

vi.mocked(useAuth).mockReturnValue(authState);

import App from './App.vue';
import LoginPage from './pages/Login.vue';
import SetupPage from './pages/Setup.vue';
import DesktopWorkspacePage from './pages/DesktopWorkspace.vue';

function createTestRouter(initialRoute = '/') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: DesktopWorkspacePage },
      { path: '/login', component: LoginPage },
      { path: '/setup', component: SetupPage },
      { path: '/:pathMatch(.*)*', component: DesktopWorkspacePage },
    ],
    initialRoutes: [initialRoute],
  });
}

describe('client App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(authState, {
      isAuthenticated: true,
      isLoading: false,
      isBootstrapLoading: false,
      isInitialized: true,
    });
  });

  it('shows a loading screen while auth state is loading', async () => {
    Object.assign(authState, { isLoading: true });
    const router = createTestRouter('/');
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain('dashboard.loading');
  });
});
