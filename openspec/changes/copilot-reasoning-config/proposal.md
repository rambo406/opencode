## Why

Users of GitHub Copilot models currently have no way to set a default reasoning level (variant) per model. Each time they start a session, the reasoning level falls back to whatever the system default is, forcing users to manually cycle variants every session. Power users who prefer "high" reasoning for Claude but "medium" for GPT models need a persistent, per-model configuration surface.

## What Changes

- Add a new configuration section in the app settings UI that lets users set a default reasoning level (variant) per model, scoped to the `github-copilot` provider.
- Persist these per-model default variant selections to the user's opencode config (`opencode.json` or TUI config).
- When a session starts or model is selected, auto-apply the user's configured default variant for that model instead of falling back to the global default.
- The configuration screen should display only GitHub Copilot models that support reasoning variants (i.e., models where `Transform.variants()` returns a non-empty record).
- Each model row should show a dropdown/selector with the available variant levels (e.g., low, medium, high, xhigh) plus a "default" option that preserves current behavior.

## Capabilities

### New Capabilities
- `copilot-reasoning-defaults`: Configuration screen and persistence for per-model default reasoning levels scoped to the GitHub Copilot provider.

### Modified Capabilities
<!-- No existing spec-level requirements are changing. -->

## Impact

- **Config schema** (`packages/opencode/src/config/config.ts`): New optional field under the `github-copilot` provider config to store per-model default variants.
- **App UI** (`packages/app/src/components/`): New settings sub-screen or section for configuring per-model reasoning defaults, displayed alongside existing model/provider settings.
- **Session/variant logic** (`packages/opencode/src/acp/session.ts`, `packages/opencode/src/acp/agent.ts`): Variant resolution needs to check for per-model configured defaults before falling back to the global default.
- **Provider transform** (`packages/opencode/src/provider/transform.ts`): No changes needed — variant options are already computed per model.
- **i18n** (`packages/app/src/i18n/`): New translation keys for the settings screen labels.
