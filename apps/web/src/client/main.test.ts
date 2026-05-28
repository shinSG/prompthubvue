import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./i18n', () => ({
  default: {
    global: { locale: { value: 'en' } },
    install: vi.fn(),
  },
  changeLanguage: vi.fn(),
}));

vi.mock('./router', () => ({
  default: {
    push: vi.fn(),
    replace: vi.fn(),
    beforeEach: vi.fn(),
    isReady: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('./index.css', () => ({}));
vi.mock('@desktop-renderer-globals-css', () => ({}));
vi.mock('@desktop-renderer-i18n', () => ({}));

describe('client main bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the Vue app on the root element', async () => {
    const mountSpy = vi.fn();
    vi.doMock('vue', () => ({
      createApp: vi.fn(() => ({
        use: vi.fn().mockReturnThis(),
        mount: mountSpy,
      })),
    }));

    await import('./main');

    expect(mountSpy).toHaveBeenCalledWith('#root');
  });
});
