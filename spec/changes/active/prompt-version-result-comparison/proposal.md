# Proposal

## Why

Prompt authors need to compare how different versions of the same Prompt perform when sent to the same chat model. The existing AI test modal supports single-model testing and multi-model comparison, while version history supports text diffs, but there is no workflow for holding the model constant and comparing output quality across prompt versions.

## Scope

- In scope:
  - Add a prompt-version result comparison mode to the existing AI test modal.
  - Allow users to select multiple versions of the same text Prompt and exactly one chat model.
  - Execute selected versions with the same model, variable values, and output settings.
  - Render per-version responses in UI consistent with the existing AI test and multi-model comparison views.
  - Add locale strings and component tests for the new workflow.
- Out of scope:
  - Database schema changes.
  - Changes to Prompt CRUD, version restore/delete, model configuration, or AI transport semantics.
  - Persisting version comparison outputs to Prompt or PromptVersion records.
  - Image/video prompt version comparison.

## Risks

- The AI test modal is already large, so the change must remain localized and avoid broad refactors.
- Multiple calls to the same provider may hit rate limits; initial implementation runs selected versions sequentially.
- Web reuses the desktop renderer bridge, so version loading must use existing database service APIs rather than Web-only APIs.

## Rollback Thinking

The feature is UI-local. Rollback can remove the new modal mode, its local state/functions, locale keys, and tests without migrating data or changing persisted records.
