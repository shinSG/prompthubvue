# Implementation

## Shipped

- Added a text-prompt version result comparison mode to `AiTestModal`.
- Reused existing prompt version loading through `getPromptVersions()` and built a synthetic current version from the active Prompt.
- Added per-run selection for two or more Prompt versions and one chat model.
- Executed selected versions sequentially against the same model using the same variable values and existing `chatCompletion()` / `buildMessagesFromPrompt()` flow.
- Rendered per-version result cards with latency, error/success state, Markdown response rendering, and thinking content support.
- Updated version comparison calls to preserve the selected model's streaming and thinking settings, matching the successful single-model test path instead of forcing non-streaming requests.
- Kept comparison outputs transient; no Prompt, PromptVersion, model config, database, or IPC behavior was changed.
- Stabilized the shared Web AI testing transport used by both normal AI tests and version comparison by extending the Web AI proxy timeout, surfacing status-zero transport diagnostics in the renderer, and preferring public IPv4 DNS results when available.
- Added locale strings for all seven desktop renderer locales.
- Extended AI test workbench component coverage for same-model multi-version comparison, stream/thinking parameter preservation, and non-persistence of responses.

## Verification

- Passed: `pnpm --filter @prompthub/desktop test -- tests/unit/components/ai-test-workbench.test.tsx --run`.
- Passed: `pnpm --filter @prompthub/desktop test -- tests/unit/services/ai-transport.test.ts tests/unit/components/ai-test-workbench.test.tsx --run`.
- Passed: `pnpm --filter @prompthub/web test -- --run src/routes/ai.test.ts`.
- Passed: `pnpm --filter @prompthub/web test -- --run src/utils/remote-http.test.ts src/routes/ai.test.ts`.
- Passed: Problems diagnostics for `AiTestModal.tsx` and `ai-test-workbench.test.tsx`.
- Passed: `pnpm --filter @prompthub/desktop lint`.
- Attempted: `pnpm --filter @prompthub/desktop typecheck`.
	- Blocked by pre-existing errors outside this change in `src/main/services/rules-workspace.ts`, `src/renderer/App.tsx`, `src/renderer/components/prompt/QuickAddModal.tsx`, `src/renderer/components/settings/AISettings.tsx`, and `../../packages/db/src/rule.ts`.
- Attempted: `pnpm --filter @prompthub/desktop test -- --run`.
	- Blocked by existing failures in updater/rules main-process tests; focused component test passed.
- Environment note: commands warn that the package expects Node >=22 while the current runtime is Node v20.19.2.

## Synced Docs

- Updated `spec/domains/prompt-workspace/spec.md` with stable version result comparison behavior.

## Follow-ups

- Consider response-diff visualization as a separate change if users need automated output-difference highlighting.
- Consider a persisted comparison-run artifact only if future requirements need auditability or reproducibility.
