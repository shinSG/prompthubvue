# Implementation

## Status

In progress.

## Shipped

- Created active change folder and delta specs.
- Added DB schema for user-scoped model configs:
	- `user_ai_models`
	- `user_ai_scenario_defaults`
- Added DB indexes and unique default-per-type constraint.
- Added migration/backfill in DB init:
	- Create tables if absent.
	- One-time full backfill from `user_settings` keys (`aiModels`, `scenarioModelDefaults`, legacy ai keys).
	- Idempotent migration markers.
- Added Web service: `ModelConfigService` for CRUD + scenario defaults.
- Added Web route: `/api/model-configs`.
- Registered route in app protected API.
- Updated AI routes:
	- Accept `modelId`/`scenario` in payload.
	- Accept `X-PromptHub-Model-Id` header from bridge.
	- Resolve model config by authenticated user and override outbound auth/model endpoint.
	- Return not-found for cross-user model id.
- Updated renderer AI transport calls to include `X-PromptHub-Model-Id` when model id exists.
- Added tests:
	- `apps/web/src/routes/model-configs.test.ts`
	- Extended `apps/web/src/routes/ai.test.ts` with user-scope enforcement case.

## Verification

- Command:
	- `pnpm --filter @prompthub/web test -- --run src/routes/model-configs.test.ts src/routes/ai.test.ts`
- Result:
	- 2 test files passed, 6 tests passed.
- Additional diagnostics:
	- No TypeScript/Problems errors in modified files.

## Notes

- This change is Web-only.
- Migration strategy is one-time full backfill.
- Model secrets are stored as plaintext by requirement; compensating controls are tracked in design/tasks.