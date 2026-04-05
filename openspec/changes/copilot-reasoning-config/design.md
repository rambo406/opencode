## Context

OpenCode currently supports reasoning variants (effort levels) per model through `Transform.variants()` in `packages/opencode/src/provider/transform.ts`. These variants are computed at runtime based on the model's provider SDK and capabilities. Users can cycle variants during a session via keybind (`ctrl+t`), but there is no persistent configuration to set a default reasoning level per model.

The variant system stores the current variant in the session state (`acp/session.ts`), defaulting to a global `"default"` value. The GitHub Copilot provider (`@ai-sdk/github-copilot`) supports reasoning variants for OpenAI models (low/medium/high/xhigh) and Claude models (thinking budget).

The app settings UI (`packages/app/src/components/`) already has dedicated screens for general settings, models, providers, and keybinds — following a consistent `SettingsList` component pattern.

## Goals / Non-Goals

**Goals:**
- Allow users to persistently configure a default reasoning level per model for the GitHub Copilot provider.
- Display a settings screen showing only Copilot models that support reasoning variants.
- Auto-apply the configured default variant when a model is selected for a new session.
- Store configuration in the existing opencode config schema (provider-level config under `github-copilot`).

**Non-Goals:**
- Supporting per-model reasoning defaults for all providers (this change is scoped to `github-copilot` only; the pattern can be extended later).
- Changing the existing variant cycling behavior during active sessions.
- Adding new reasoning effort levels beyond what each model already supports.
- Auto-migration of existing user variant preferences (there are none to migrate).

## Decisions

### 1. Config schema: per-model `defaultVariant` under provider options

Store the per-model default variant in the existing provider config structure:

```json
{
  "provider": {
    "github-copilot": {
      "models": {
        "gpt-4.1": {
          "variants": {
            "high": {},
            "default_variant": true
          }
        }
      }
    }
  }
}
```

**Alternative considered**: A top-level `reasoning` config section. Rejected because the variant system is already provider+model-scoped, and the existing `provider.*.models.*.variants` structure in `config.ts` is the natural home.

**Chosen approach**: Add an optional `default_variant` field to the provider's per-model config. When resolving variants, check if the model has a `default_variant` configured in the provider config and use it instead of the global default.

### 2. Variant resolution order

1. Session-level variant (user cycled via keybind during the session) — highest priority
2. Per-model `default_variant` from provider config — new layer
3. Agent-level variant from agent config — existing
4. Global default (`"default"`) — existing fallback

**Rationale**: This preserves all existing behavior. The new layer only activates when no session-level override exists.

### 3. UI: New settings section within the existing settings panel

Add a `SettingsReasoningDefaults` component that:
- Filters models to only show `github-copilot` provider models with non-empty `Transform.variants()`.
- Displays each model with a dropdown of available variants + "default" option.
- Persists selection by calling the config update API.

**Alternative considered**: Inline per-model variant selectors in the existing Models settings screen. Rejected because it would clutter the models list for non-reasoning models and mix concerns.

### 4. SDK surface for variant availability

The app already receives model data including capabilities through the existing `config.providers` endpoint. The variant computation happens server-side in `Transform.variants()`. The settings screen will use the existing provider/model data to determine which models support reasoning and what levels are available.

## Risks / Trade-offs

- **[Model variant mismatch]** → The available variants for a Copilot model may change over time (e.g., new effort levels added). Mitigation: If a configured default variant is no longer available for a model, fall back to `"default"` silently and log a warning.
- **[Config bloat]** → Users with many models could accumulate entries. Mitigation: Only store non-default values; the "default" option removes the entry rather than storing it.
- **[Copilot-only scope]** → Users may expect this for other providers. Mitigation: The implementation pattern is generic enough to extend to other providers in a follow-up, but the UI is explicitly scoped to Copilot to keep the initial change focused.
