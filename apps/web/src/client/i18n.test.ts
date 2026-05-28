import { describe, expect, it, vi } from 'vitest';

function setNavigatorLanguage(language: string): void {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
}

async function loadI18nFor(language: string) {
  vi.resetModules();
  setNavigatorLanguage(language);
  const module = await import('./i18n');
  return module.default;
}

describe('client i18n initialization', () => {
  it('uses English for English browser locales', async () => {
    const i18n = await loadI18nFor('en-US');

    expect(i18n.global.locale.value).toBe('en');
  });

  it('maps simplified Chinese browser locales to zh', async () => {
    const i18n = await loadI18nFor('zh-CN');

    expect(i18n.global.locale.value).toBe('zh');
  });

  it('maps Traditional Chinese locales to zh-TW', async () => {
    expect((await loadI18nFor('zh-TW')).global.locale.value).toBe('zh-TW');
    expect((await loadI18nFor('zh-HK')).global.locale.value).toBe('zh-TW');
  });

  it('keeps supported non-Chinese locales', async () => {
    const i18n = await loadI18nFor('ja-JP');

    expect(i18n.global.locale.value).toBe('ja');
  });

  it('falls back to English for unsupported locales', async () => {
    const i18n = await loadI18nFor('ko-KR');

    expect(i18n.global.locale.value).toBe('en');
  });
});
