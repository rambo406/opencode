## 1. Config Schema

- [x] 1.1 Add optional `default_variant` field to the per-model variant config in `packages/opencode/src/config/config.ts` under the provider models schema
- [x] 1.2 Expose a helper to read the per-model default variant from the resolved config for a given provider+model pair

## 2. Variant Resolution

- [x] 2.1 Update variant resolution in `packages/opencode/src/acp/agent.ts` to check for per-model `default_variant` in the provider config before falling back to the agent/global default
- [x] 2.2 Add graceful fallback: if configured variant is not in the model's available variants, log a warning and use `"default"`

## 3. SDK / API Surface

- [x] 3.1 Ensure the provider config endpoint returns per-model variant defaults so the app can read them
- [x] 3.2 Add or verify an API to update per-model variant defaults in the provider config (config write path)

## 4. App Settings UI

- [x] 4.1 Create `SettingsReasoningDefaults` component in `packages/app/src/components/` that lists GitHub Copilot models with reasoning variants
- [x] 4.2 Add a variant selector dropdown per model row showing available variants plus "default" option
- [x] 4.3 Wire the selector to persist changes via the config update API; selecting "default" removes the entry
- [x] 4.4 Add the new settings section/tab to the settings navigation alongside existing screens

## 5. Internationalization

- [x] 5.1 Add translation keys for the reasoning defaults settings screen (title, description, dropdown labels) in `packages/app/src/i18n/en.ts`
- [x] 5.2 Add corresponding keys to other supported locale files (ar, ja, fr, es, etc.)

## 6. Testing

- [x] 6.1 Add unit tests for variant resolution with per-model defaults (configured, missing, invalid variant fallback)
- [x] 6.2 Add integration test verifying the settings screen renders only reasoning-capable Copilot models
- [x] 6.3 Verify that session-level variant override still takes precedence over per-model default
