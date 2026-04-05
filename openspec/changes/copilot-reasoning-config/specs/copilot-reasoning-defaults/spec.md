## ADDED Requirements

### Requirement: Per-model default reasoning variant configuration
The system SHALL allow users to configure a default reasoning level (variant) for each GitHub Copilot model that supports reasoning variants.

#### Scenario: User sets default reasoning level for a model
- **WHEN** user navigates to the reasoning defaults settings screen and selects "high" for the model `gpt-4.1`
- **THEN** the system persists `"high"` as the default variant for `gpt-4.1` under the `github-copilot` provider config

#### Scenario: User resets to default reasoning level
- **WHEN** user selects "default" for a model that previously had a configured variant
- **THEN** the system removes the per-model variant entry from the config (does not store "default" explicitly)

### Requirement: Only reasoning-capable models are shown
The settings screen SHALL display only GitHub Copilot models that have at least one reasoning variant available.

#### Scenario: Model without reasoning variants
- **WHEN** the settings screen loads and a GitHub Copilot model has no reasoning variants (e.g., `Transform.variants()` returns empty)
- **THEN** that model is not displayed in the reasoning defaults configuration list

#### Scenario: Model with reasoning variants
- **WHEN** the settings screen loads and a GitHub Copilot model supports reasoning variants (e.g., low, medium, high)
- **THEN** the model is displayed with a selector showing all available variant levels plus a "default" option

### Requirement: Default variant auto-applied on session start
The system SHALL auto-apply the user's configured default variant for a model when that model is selected for a new session, unless a session-level override exists.

#### Scenario: Session starts with configured default variant
- **WHEN** a new session starts with model `gpt-4.1` and the user has configured "high" as the default variant for that model
- **THEN** the session uses "high" as the active variant without user intervention

#### Scenario: Session-level override takes precedence
- **WHEN** a session has model `gpt-4.1` with configured default "high" and the user cycles the variant to "low" during the session
- **THEN** the session uses "low" as the active variant (session override wins)

#### Scenario: No configured default falls back to global default
- **WHEN** a new session starts with a model that has no per-model default variant configured
- **THEN** the system uses the existing default variant resolution (agent config → global "default")

### Requirement: Graceful handling of invalid configured variants
The system SHALL handle cases where a previously configured variant is no longer available for a model.

#### Scenario: Configured variant no longer available
- **WHEN** a model's configured default variant (e.g., "xhigh") is no longer in the model's available variants
- **THEN** the system falls back to "default" and logs a warning

### Requirement: Settings screen variant display
The settings screen SHALL group models by provider and display each model's current default variant selection.

#### Scenario: Viewing configured defaults
- **WHEN** user opens the reasoning defaults settings screen
- **THEN** each reasoning-capable Copilot model shows its currently configured default variant (or "default" if none configured)
