import type { AIProtocol } from '@prompthub/shared/types';
import { getServerDatabase } from '../database.js';

export type ModelType = 'chat' | 'image';
export type AIUsageScenario = 'quickAdd' | 'promptTest' | 'imageTest' | 'translation';

export interface UserAIModelConfig {
  id: string;
  userId: string;
  type: ModelType;
  name?: string;
  provider: string;
  apiProtocol: AIProtocol;
  apiKey: string;
  apiUrl: string;
  model: string;
  isDefault: boolean;
  chatParams?: Record<string, unknown>;
  imageParams?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface UpsertUserAIModelInput {
  id: string;
  type: ModelType;
  name?: string;
  provider: string;
  apiProtocol: AIProtocol;
  apiKey: string;
  apiUrl: string;
  model: string;
  isDefault?: boolean;
  chatParams?: Record<string, unknown>;
  imageParams?: Record<string, unknown>;
}

interface ModelRow {
  user_id: string;
  id: string;
  model_type: ModelType;
  name: string | null;
  provider: string;
  api_protocol: AIProtocol;
  api_key: string;
  api_url: string;
  model: string;
  is_default: number;
  chat_params: string | null;
  image_params: string | null;
  created_at: number;
  updated_at: number;
}

function parseJsonObject(value: string | null): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function toModel(row: ModelRow): UserAIModelConfig {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.model_type,
    name: row.name ?? undefined,
    provider: row.provider,
    apiProtocol: row.api_protocol,
    apiKey: row.api_key,
    apiUrl: row.api_url,
    model: row.model,
    isDefault: row.is_default === 1,
    chatParams: parseJsonObject(row.chat_params),
    imageParams: parseJsonObject(row.image_params),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ModelConfigService {
  private readonly db = getServerDatabase();

  list(userId: string): UserAIModelConfig[] {
    const rows = this.db
      .prepare(
        `SELECT user_id, id, model_type, name, provider, api_protocol, api_key, api_url, model,
                is_default, chat_params, image_params, created_at, updated_at
         FROM user_ai_models
         WHERE user_id = ?
         ORDER BY is_default DESC, updated_at DESC`,
      )
      .all(userId) as ModelRow[];

    return rows.map(toModel);
  }

  get(userId: string, modelId: string): UserAIModelConfig | null {
    const row = this.db
      .prepare(
        `SELECT user_id, id, model_type, name, provider, api_protocol, api_key, api_url, model,
                is_default, chat_params, image_params, created_at, updated_at
         FROM user_ai_models
         WHERE user_id = ? AND id = ?`,
      )
      .get(userId, modelId) as ModelRow | undefined;

    return row ? toModel(row) : null;
  }

  getScenarioDefaults(userId: string): Partial<Record<AIUsageScenario, string>> {
    const rows = this.db
      .prepare(
        `SELECT scenario, model_id
         FROM user_ai_scenario_defaults
         WHERE user_id = ?`,
      )
      .all(userId) as Array<{ scenario: AIUsageScenario; model_id: string }>;

    const defaults: Partial<Record<AIUsageScenario, string>> = {};
    for (const row of rows) {
      defaults[row.scenario] = row.model_id;
    }
    return defaults;
  }

  upsert(userId: string, input: UpsertUserAIModelInput): UserAIModelConfig {
    const now = Date.now();
    const updateDefaultStmt = this.db.prepare(
      `UPDATE user_ai_models
       SET is_default = 0, updated_at = ?
       WHERE user_id = ? AND model_type = ?`,
    );
    const upsertStmt = this.db.prepare(
      `INSERT INTO user_ai_models (
         user_id, id, model_type, name, provider, api_protocol, api_key, api_url,
         model, is_default, chat_params, image_params, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         model_type = excluded.model_type,
         name = excluded.name,
         provider = excluded.provider,
         api_protocol = excluded.api_protocol,
         api_key = excluded.api_key,
         api_url = excluded.api_url,
         model = excluded.model,
         is_default = excluded.is_default,
         chat_params = excluded.chat_params,
         image_params = excluded.image_params,
         updated_at = excluded.updated_at`,
    );

    const write = this.db.transaction(() => {
      if (input.isDefault) {
        updateDefaultStmt.run(now, userId, input.type);
      }

      upsertStmt.run(
        userId,
        input.id,
        input.type,
        input.name ?? null,
        input.provider,
        input.apiProtocol,
        input.apiKey,
        input.apiUrl,
        input.model,
        input.isDefault ? 1 : 0,
        input.chatParams ? JSON.stringify(input.chatParams) : null,
        input.imageParams ? JSON.stringify(input.imageParams) : null,
        now,
        now,
      );
    });

    write();
    const model = this.get(userId, input.id);
    if (!model) {
      throw new Error(`Failed to persist model config ${input.id}`);
    }
    return model;
  }

  delete(userId: string, modelId: string): boolean {
    const clearDefaultsStmt = this.db.prepare(
      'DELETE FROM user_ai_scenario_defaults WHERE user_id = ? AND model_id = ?',
    );
    const deleteStmt = this.db.prepare(
      'DELETE FROM user_ai_models WHERE user_id = ? AND id = ?',
    );

    const runDelete = this.db.transaction(() => {
      clearDefaultsStmt.run(userId, modelId);
      return deleteStmt.run(userId, modelId);
    });

    const result = runDelete() as { changes?: number };
    return (result.changes ?? 0) > 0;
  }

  setScenarioDefault(userId: string, scenario: AIUsageScenario, modelId: string | null): void {
    if (!modelId) {
      this.db
        .prepare('DELETE FROM user_ai_scenario_defaults WHERE user_id = ? AND scenario = ?')
        .run(userId, scenario);
      return;
    }

    const model = this.get(userId, modelId);
    if (!model) {
      throw new Error(`Model ${modelId} was not found`);
    }

    this.db
      .prepare(
        `INSERT OR REPLACE INTO user_ai_scenario_defaults (user_id, scenario, model_id, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(userId, scenario, modelId, Date.now());
  }
}
