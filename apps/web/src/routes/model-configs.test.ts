import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDatabase } from '@prompthub/db';

const ENV_KEYS = [
  'PORT',
  'HOST',
  'JWT_SECRET',
  'JWT_ACCESS_TTL',
  'JWT_REFRESH_TTL',
  'DATA_ROOT',
  'ALLOW_REGISTRATION',
  'LOG_LEVEL',
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

async function createTestApp(dataDir: string) {
  process.env.PORT = '3992';
  process.env.HOST = '127.0.0.1';
  process.env.JWT_SECRET = 'test-secret-for-web-model-configs-1234567890';
  process.env.JWT_ACCESS_TTL = '900';
  process.env.JWT_REFRESH_TTL = '604800';
  process.env.DATA_ROOT = dataDir;
  process.env.ALLOW_REGISTRATION = 'true';
  process.env.LOG_LEVEL = 'debug';

  const [{ createApp }] = await Promise.all([import('../app')]);
  return createApp();
}

async function registerUser(app: Awaited<ReturnType<typeof createTestApp>>, username: string, password: string) {
  const response = await app.request(
    new Request('http://local/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  );

  const payload = await response.json() as {
    data: {
      accessToken: string;
    };
  };

  return { response, payload };
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

describe('web model config routes', () => {
  const TEST_TIMEOUT = 20000;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    closeDatabase();
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('upserts per-user model configs and isolates users', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompthub-web-model-config-test-'));

    try {
      const app = await createTestApp(dataDir);
      const { payload: userA } = await registerUser(app, 'model_owner_a', 'debugpass001');
      const { payload: userB } = await registerUser(app, 'model_owner_b', 'debugpass001');

      const upsert = await app.request(
        new Request('http://local/api/model-configs/chat-default', {
          method: 'PUT',
          headers: authHeaders(userA.data.accessToken),
          body: JSON.stringify({
            id: 'chat-default',
            type: 'chat',
            provider: 'openai',
            apiProtocol: 'openai',
            apiKey: 'sk-test-a',
            apiUrl: 'https://api.openai.com',
            model: 'gpt-4o-mini',
            isDefault: true,
          }),
        }),
      );
      expect(upsert.status).toBe(200);

      const setScenario = await app.request(
        new Request('http://local/api/model-configs/scenario-defaults', {
          method: 'PUT',
          headers: authHeaders(userA.data.accessToken),
          body: JSON.stringify({
            scenario: 'promptTest',
            modelId: 'chat-default',
          }),
        }),
      );
      expect(setScenario.status).toBe(200);

      const listA = await app.request(
        new Request('http://local/api/model-configs', {
          headers: authHeaders(userA.data.accessToken),
        }),
      );
      expect(listA.status).toBe(200);
      const listABody = await listA.json() as {
        data: {
          models: Array<{ id: string; apiKey: string; isDefault: boolean }>;
          scenarioModelDefaults: Record<string, string>;
        };
      };
      expect(listABody.data.models).toHaveLength(1);
      expect(listABody.data.models[0]).toEqual(
        expect.objectContaining({
          id: 'chat-default',
          apiKey: 'sk-test-a',
          isDefault: true,
        }),
      );
      expect(listABody.data.scenarioModelDefaults.promptTest).toBe('chat-default');

      const listB = await app.request(
        new Request('http://local/api/model-configs', {
          headers: authHeaders(userB.data.accessToken),
        }),
      );
      expect(listB.status).toBe(200);
      const listBBody = await listB.json() as {
        data: {
          models: unknown[];
          scenarioModelDefaults: Record<string, string>;
        };
      };
      expect(listBBody.data.models).toEqual([]);
      expect(listBBody.data.scenarioModelDefaults).toEqual({});
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT);
});
