import { Hono } from 'hono';
import { z } from 'zod';
import { getAuthUser } from '../middleware/auth.js';
import { ModelConfigService } from '../services/model-config.service.js';
import { error, ErrorCode, success } from '../utils/response.js';
import { parseJsonBody } from '../utils/validation.js';

const modelConfigs = new Hono();
const service = new ModelConfigService();

const scenarioSchema = z.enum(['quickAdd', 'promptTest', 'imageTest', 'translation']);

const upsertSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['chat', 'image']),
  name: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1),
  apiProtocol: z.enum(['openai', 'gemini', 'anthropic']),
  apiKey: z.string().trim().min(1),
  apiUrl: z.string().trim().min(1),
  model: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
  chatParams: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  imageParams: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const setScenarioSchema = z.object({
  scenario: scenarioSchema,
  modelId: z.string().trim().min(1).nullable(),
});

modelConfigs.get('/', async (c) => {
  try {
    const { userId } = getAuthUser(c);
    const models = service.list(userId);
    const scenarioModelDefaults = service.getScenarioDefaults(userId);
    return success(c, { models, scenarioModelDefaults });
  } catch {
    return error(c, 500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
});

modelConfigs.put('/scenario-defaults', async (c) => {
  const parsed = await parseJsonBody(c, setScenarioSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const { userId } = getAuthUser(c);
    service.setScenarioDefault(userId, parsed.data.scenario, parsed.data.modelId);
    return success(c, { ok: true });
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Internal server error';
    if (message.includes('not found')) {
      return error(c, 404, ErrorCode.NOT_FOUND, message);
    }
    return error(c, 500, ErrorCode.INTERNAL_ERROR, message);
  }
});

modelConfigs.put('/:id', async (c) => {
  const parsed = await parseJsonBody(c, upsertSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const pathId = c.req.param('id');
  if (pathId !== parsed.data.id) {
    return error(c, 400, ErrorCode.BAD_REQUEST, 'Path model id does not match payload id');
  }

  try {
    const { userId } = getAuthUser(c);
    const model = service.upsert(userId, parsed.data);
    return success(c, model);
  } catch (routeError) {
    return error(
      c,
      500,
      ErrorCode.INTERNAL_ERROR,
      routeError instanceof Error ? routeError.message : 'Internal server error',
    );
  }
});

modelConfigs.delete('/:id', async (c) => {
  try {
    const { userId } = getAuthUser(c);
    const deleted = service.delete(userId, c.req.param('id'));
    if (!deleted) {
      return error(c, 404, ErrorCode.NOT_FOUND, 'Model not found');
    }
    return success(c, { ok: true });
  } catch {
    return error(c, 500, ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
});

export default modelConfigs;
