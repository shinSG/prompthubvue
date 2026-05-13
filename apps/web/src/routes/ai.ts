import { Hono } from 'hono';
import { z } from 'zod';
import type { AITransportRequest, AITransportResponse } from '@prompthub/shared';
import { getAuthUser } from '../middleware/auth.js';
import { ModelConfigService } from '../services/model-config.service.js';
import { error, ErrorCode, success } from '../utils/response.js';
import { parseJsonBody } from '../utils/validation.js';
import { requestRemoteBuffered, requestRemoteStream } from '../utils/remote-http.js';

const ai = new Hono();
const modelConfigService = new ModelConfigService();

const requestSchema = z.object({
  requestId: z.string().trim().min(1).optional(),
  method: z.enum(['GET', 'POST']),
  url: z.string().trim().url('url must be valid').optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  modelId: z.string().trim().min(1).optional(),
  scenario: z.enum(['quickAdd', 'promptTest', 'imageTest', 'translation']).optional(),
}).superRefine((value, ctx) => {
  if (!value.modelId && !value.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'url is required when modelId is not provided',
      path: ['url'],
    });
  }
});

function inferProtocol(provider: string, apiUrl: string, apiProtocol?: string): 'openai' | 'gemini' | 'anthropic' {
  if (apiProtocol === 'openai' || apiProtocol === 'gemini' || apiProtocol === 'anthropic') {
    return apiProtocol;
  }

  const providerLower = provider.toLowerCase();
  const urlLower = apiUrl.toLowerCase();

  if (providerLower === 'anthropic' || urlLower.includes('api.anthropic.com')) {
    return 'anthropic';
  }

  if (
    providerLower === 'google' ||
    providerLower === 'gemini' ||
    urlLower.includes('generativelanguage.googleapis.com')
  ) {
    return 'gemini';
  }

  return 'openai';
}

function buildChatEndpoint(apiUrl: string, protocol: 'openai' | 'gemini' | 'anthropic'): string {
  const base = apiUrl.replace(/\/+$/, '');
  if (protocol === 'anthropic') {
    if (base.match(/\/v\d+$/)) {
      return `${base}/messages`;
    }
    return `${base}/v1/messages`;
  }
  if (base.match(/\/v\d+$/)) {
    return `${base}/chat/completions`;
  }
  return `${base}/v1/chat/completions`;
}

function buildHeaders(protocol: 'openai' | 'gemini' | 'anthropic', apiKey: string, sourceHeaders?: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(sourceHeaders ?? {})) {
    const keyLower = key.toLowerCase();
    if (keyLower === 'authorization' || keyLower === 'x-goog-api-key' || keyLower === 'x-api-key') {
      continue;
    }
    sanitized[key] = value;
  }

  if (protocol === 'anthropic') {
    sanitized['x-api-key'] = apiKey;
    if (!sanitized['anthropic-version']) {
      sanitized['anthropic-version'] = '2023-06-01';
    }
    return sanitized;
  }

  if (protocol === 'gemini') {
    sanitized['x-goog-api-key'] = apiKey;
    return sanitized;
  }

  sanitized.Authorization = `Bearer ${apiKey}`;
  return sanitized;
}

function normalizeModelBoundRequest(
  userId: string,
  request: z.infer<typeof requestSchema>,
  modelIdOverride?: string,
): AITransportRequest {
  const modelId = modelIdOverride ?? request.modelId ?? modelConfigService.getScenarioDefaults(userId)[request.scenario ?? 'promptTest'];
  if (!modelId) {
    throw Object.assign(new Error('Model was not specified'), { status: 404, code: ErrorCode.NOT_FOUND });
  }

  const model = modelConfigService.get(userId, modelId);
  if (!model) {
    throw Object.assign(new Error('Model not found for current user'), { status: 404, code: ErrorCode.NOT_FOUND });
  }

  const protocol = inferProtocol(model.provider, model.apiUrl, model.apiProtocol);
  const headers = buildHeaders(protocol, model.apiKey, request.headers);

  let body = request.body;
  if (body) {
    try {
      const parsedBody = JSON.parse(body) as unknown;
      if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
        const bodyObj = parsedBody as Record<string, unknown>;
        bodyObj.model = model.model;
        body = JSON.stringify(bodyObj);
      }
    } catch {
      // Keep original body when it is not JSON.
    }
  }

  return {
    requestId: request.requestId,
    method: request.method,
    url: buildChatEndpoint(model.apiUrl, protocol),
    headers,
    body,
  };
}

function toTransportResponse(response: {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}): AITransportResponse {
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: response.statusText,
    body: response.body,
    headers: response.headers,
  };
}

function toErrorResponse(routeError: unknown): AITransportResponse {
  return {
    ok: false,
    status: 0,
    statusText: '',
    body: '',
    headers: {},
    error: routeError instanceof Error ? routeError.message : 'Unknown error',
  };
}

async function executeBufferedRequest(request: AITransportRequest): Promise<AITransportResponse> {
  try {
    const response = await requestRemoteBuffered({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      allowedProtocols: ['https:', 'http:'],
    });

    return toTransportResponse({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body.toString('utf-8'),
    });
  } catch (routeError) {
    return toErrorResponse(routeError);
  }
}

ai.post('/request', async (c) => {
  const parsed = await parseJsonBody(c, requestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  let request = parsed.data as AITransportRequest;
  const modelIdFromHeader = parsed.data.headers?.['X-PromptHub-Model-Id'] ?? parsed.data.headers?.['x-prompthub-model-id'];
  if (parsed.data.modelId || parsed.data.scenario || modelIdFromHeader) {
    try {
      const { userId } = getAuthUser(c);
      request = normalizeModelBoundRequest(userId, parsed.data, modelIdFromHeader);
    } catch (routeError) {
      const status = (routeError as { status?: 404 | 500 }).status;
      const code = (routeError as { code?: string }).code;
      return error(
        c,
        status === 404 ? 404 : 500,
        code ?? (status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_ERROR),
        routeError instanceof Error ? routeError.message : 'Internal server error',
      );
    }
  }

  const response = await executeBufferedRequest(request);
  return success(c, response);
});

ai.post('/stream', async (c) => {
  const parsed = await parseJsonBody(c, requestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  let request = parsed.data as AITransportRequest;
  const modelIdFromHeader = parsed.data.headers?.['X-PromptHub-Model-Id'] ?? parsed.data.headers?.['x-prompthub-model-id'];
  if (parsed.data.modelId || parsed.data.scenario || modelIdFromHeader) {
    try {
      const { userId } = getAuthUser(c);
      request = normalizeModelBoundRequest(userId, parsed.data, modelIdFromHeader);
    } catch (routeError) {
      const status = (routeError as { status?: 404 | 500 }).status;
      const code = (routeError as { code?: string }).code;
      return error(
        c,
        status === 404 ? 404 : 500,
        code ?? (status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_ERROR),
        routeError instanceof Error ? routeError.message : 'Internal server error',
      );
    }
  }

  try {
    const response = await requestRemoteStream({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      allowedProtocols: ['https:', 'http:'],
    });

    if (response.status < 200 || response.status >= 300 || !response.body) {
      const fallback = await executeBufferedRequest(request);
      return success(c, fallback);
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers['content-type'] ?? 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    headers.set('X-PromptHub-Request-Id', request.requestId ?? '');

    for (const [key, value] of Object.entries(response.headers)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === 'content-length' || normalizedKey === 'connection') {
        continue;
      }
      if (!headers.has(key) && value) {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (routeError) {
    return error(
      c,
      500,
      ErrorCode.INTERNAL_ERROR,
      routeError instanceof Error ? routeError.message : 'Internal server error',
    );
  }
});

export default ai;
