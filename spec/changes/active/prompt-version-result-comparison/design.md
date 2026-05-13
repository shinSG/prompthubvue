# Design

## Overview

Implement version result comparison as a new mode inside the existing desktop renderer `AiTestModal`. The Web app reuses this renderer through the existing bridge, so the feature remains available without Web-specific UI. The implementation reuses existing prompt version reads, AI chat completion calls, variable filling, Markdown rendering, and visual tokens.

## Affected Areas

- Data model:
  - No schema or shared type changes are required.
  - Use existing `PromptVersion` records and a synthetic current version built from the active `Prompt`.
- IPC / API:
  - No new IPC or REST endpoint is required.
  - Use existing `getPromptVersions(promptId)` from renderer database service.
- Filesystem / sync:
  - No filesystem, backup, sync, import, or export behavior changes.
- UI / UX:
  - Add a new text-prompt mode button in `AiTestModal`.
  - Add version and model selectors using existing pill/button styling.
  - Add result cards matching the multi-model comparison card style, keyed by version rather than model.
  - Add i18n keys for all new user-facing strings.

## Execution Flow

1. User opens AI test for a text Prompt.
2. User switches to version result comparison mode.
3. The modal loads prompt versions via `getPromptVersions(prompt.id)` and prepends the current prompt state as a synthetic version.
4. User selects two or more versions and one chat model.
5. The modal replaces variables in each selected version with the current variable input state.
6. The modal calls `chatCompletion()` once per selected version with the same AI config.
7. The modal renders per-version results and does not persist responses.

## Tradeoffs

- Keep implementation local to `AiTestModal` instead of extracting shared utilities first. This minimizes cross-module impact but leaves the modal large.
- Run calls sequentially to reduce provider rate-limit risk and simplify per-version error handling.
- Do not save responses, preserving existing `lastAiResponse` and `PromptVersion.aiResponse` semantics.
