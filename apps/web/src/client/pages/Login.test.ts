import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useI18n } from 'vue-i18n';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../composables/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../composables/useAuth';
import LoginPage from './Login.vue';

const loginMock = vi.fn();

function createAuthValue(isAuthenticated: boolean) {
  return {
    login: loginMock,
    register: vi.fn(),
    isAuthenticated,
    user: null,
    token: null,
    isLoading: false,
    isBootstrapLoading: false,
    isInitialized: true,
    registrationAllowed: true,
    logout: vi.fn(),
    refreshBootstrap: vi.fn(),
  };
}

function createTestRouter(initialRoute = '/login') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div data-testid="home">Home</div>' } },
      { path: '/login', component: LoginPage },
      { path: '/setup', component: { template: '<div data-testid="setup">Setup</div>' } },
      { path: '/register', component: { template: '<div data-testid="register">Register</div>' } },
      { path: '/target', component: { template: '<div data-testid="target">Target</div>' } },
    ],
    initialRoutes: [initialRoute],
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthValue(false));
  });

  it('renders login form and calls login on submit', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    const router = createTestRouter('/login');
    await router.push('/login');
    await router.isReady();

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain('auth.loginTitle');

    const usernameInput = wrapper.find('#username');
    const passwordInput = wrapper.find('#password');

    await usernameInput.setValue('user');
    await passwordInput.setValue('pass');

    await wrapper.find('form').trigger('submit');

    expect(loginMock).toHaveBeenCalledWith({ username: 'user', password: 'pass' });
  });

  it('shows error when login fails', async () => {
    loginMock.mockRejectedValueOnce(new Error('Bad credentials'));
    const router = createTestRouter('/login');
    await router.push('/login');
    await router.isReady();

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
      },
    });

    await wrapper.find('#username').setValue('user');
    await wrapper.find('#password').setValue('pass');

    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Bad credentials');
  });

  it('shows registration link', async () => {
    const router = createTestRouter('/login');
    await router.push('/login');
    await router.isReady();

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain('auth.needAccount');
    expect(wrapper.text()).toContain('auth.register');
  });
});
