import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './composables/useAuth';
import LoginPage from './pages/Login.vue';
import RegisterPage from './pages/Register.vue';
import SetupPage from './pages/Setup.vue';
import DesktopWorkspacePage from './pages/DesktopWorkspace.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: SetupPage,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
    },
    {
      path: '/',
      name: 'workspace',
      component: DesktopWorkspacePage,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'catch-all',
      component: DesktopWorkspacePage,
    },
  ],
});

// Wait for the initial auth state to resolve before running guards
let authReady = false;
const authReadyCallbacks: Array<() => void> = [];

function onAuthReady(cb: () => void) {
  if (authReady) {
    cb();
  } else {
    authReadyCallbacks.push(cb);
  }
}

// Poll for auth readiness (bootstrap + initial session load)
const authReadyInterval = setInterval(() => {
  const { isBootstrapLoading, isLoading } = useAuth();
  if (!isBootstrapLoading.value && !isLoading.value) {
    authReady = true;
    clearInterval(authReadyInterval);
    authReadyCallbacks.forEach((cb) => cb());
    authReadyCallbacks.length = 0;
  }
}, 50);

router.beforeEach((to, _from, next) => {
  const doGuard = () => {
    const { isAuthenticated, isInitialized } = useAuth();

    // Setup route: only accessible when not initialized
    if (to.name === 'setup') {
      if (isInitialized.value) {
        next(isAuthenticated.value ? '/' : '/login');
      } else {
        next();
      }
      return;
    }

    // Protected routes: require auth and initialized
    if (to.name === 'workspace' || to.name === 'catch-all') {
      if (!isInitialized.value) {
        next({ path: '/setup' });
      } else if (!isAuthenticated.value) {
        next({ path: '/login', query: { redirect: to.fullPath } });
      } else {
        next();
      }
      return;
    }

    // Login/Register: always accessible
    next();
  };

  if (authReady) {
    doGuard();
  } else {
    onAuthReady(doGuard);
  }
});

export default router;
