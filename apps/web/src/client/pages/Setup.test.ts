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
import SetupPage from './Setup.vue';

const registerMock = vi.fn();

function createTestRouter(initialRoute = '/setup') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div data-testid="home">Home</div>' } },
      { path: '/setup', component: SetupPage },
      { path: '/login', component: { template: '<div data-testid="login">Login</div>' } },
    ],
    initialRoutes: [initialRoute],
  });
}

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      register: registerMock,
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      isBootstrapLoading: false,
      isInitialized: false,
      registrationAllowed: true,
      logout: vi.fn(),
      refreshBootstrap: vi.fn(),
    });
  });

  it('creates the first account through the setup flow', async () => {
    registerMock.mockResolvedValueOnce(undefined);
    const router = createTestRouter('/setup');
    await router.push('/setup');
    await router.isReady();

    const wrapper = mount(SetupPage, {
      global: {
        plugins: [router],
      },
    });

    await wrapper.find('#setup-username').setValue('owner');
    await wrapper.find('#setup-password').setValue('debugpass001');
    await wrapper.find('#setup-confirm-password').setValue('debugpass001');

    await wrapper.find('form').trigger('submit');

    expect(registerMock).toHaveBeenCalledWith({
      username: 'owner',
      password: 'debugpass001',
    });
  });

  it('shows a validation error when the passwords do not match', async () => {
    const router = createTestRouter('/setup');
    await router.push('/setup');
    await router.isReady();

    const wrapper = mount(SetupPage, {
      global: {
        plugins: [router],
      },
    });

    await wrapper.find('#setup-username').setValue('owner');
    await wrapper.find('#setup-password').setValue('debugpass001');
    await wrapper.find('#setup-confirm-password').setValue('debugpass002');

    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('auth.setupPasswordMismatch');
    expect(registerMock).not.toHaveBeenCalled();
  });
});
