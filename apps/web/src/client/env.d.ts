/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module '@desktop-renderer-app' {
  import type { ComponentType } from 'react';
  const DesktopRendererApp: ComponentType;
  export default DesktopRendererApp;
}

declare module '@desktop-toast-provider' {
  import type { ComponentType, ReactNode } from 'react';
  export const ToastProvider: ComponentType<{ children?: ReactNode }>;
}

declare module '@desktop-renderer-i18n' {
  const desktopI18n: unknown;
  export default desktopI18n;
}

declare module '@desktop-renderer-globals-css';
