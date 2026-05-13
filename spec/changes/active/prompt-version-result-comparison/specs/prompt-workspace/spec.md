# Delta Spec

## Added

- The Prompt AI test surface shall provide a version result comparison mode for text prompts.
- The version result comparison mode shall let users select two or more versions belonging to the same Prompt.
- The version result comparison mode shall execute every selected version against the same selected chat model.
- The version result comparison mode shall use the same variable values for all selected versions in a run.
- The version result comparison mode shall show per-version success, error, latency, thinking content when present, and response content.

## Modified

- The AI test modal gains an additional text-prompt mode while preserving existing single-model test, multi-model compare, and image test behavior.

## Removed

- None.

## Scenarios

### Scenario: Compare two versions with one model

Given a text Prompt with at least one historical version
When the user opens AI test, selects version result comparison, selects current and one historical version, selects one chat model, and starts comparison
Then the app sends each selected version to that same model
And the app renders one result card per selected version.

### Scenario: Require enough versions

Given a text Prompt without enough comparable versions
When the user opens version result comparison
Then the app explains that at least two versions are required
And the run action remains unavailable.

### Scenario: Keep other modules unchanged

Given the user runs a version result comparison
When the run completes
Then Prompt CRUD records, version history restore/delete behavior, and model configuration records are not modified by the comparison result.
