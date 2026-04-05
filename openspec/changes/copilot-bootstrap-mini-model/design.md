## Context

OpenCode already generates a stable `interactionID` per user turn in `packages/opencode/src/session/prompt.ts` and threads iteration metadata into the Copilot header pipeline. The current premium-optimization work only changes headers; it still uses the user-selected model for the first request in the turn.

The requested change goes further: for GitHub Copilot turns, the first user-initiated model call should always be sent to a fixed bootstrap model, `gpt-5.4-mini`, while the selected model remains the user-visible model for the turn. This means the turn needs two model identities at once: the selected model for the session and the bootstrap model for the hidden first step.

## Goals / Non-Goals

**Goals:**
- Route the first Copilot user-turn model call through `gpt-5.4-mini`
- Reuse the same interaction ID across the bootstrap call and all later iterations in the same turn
- Keep the selected model as the model that produces user-visible assistant output
- Fall back cleanly to the selected model when the bootstrap model is unavailable

**Non-Goals:**
- Changing model selection for non-Copilot providers
- Introducing a user-facing setting for the bootstrap model in this change
- Altering the existing subagent or compaction header rules beyond what model selection requires

## Decisions

### 1. Add an explicit per-turn bootstrap model decision in the prompt loop

The prompt loop should resolve two model references at turn start:
- `selected`: the model the user picked for the session
- `bootstrap`: `github-copilot/gpt-5.4-mini` when available and the provider is GitHub Copilot

The hidden bootstrap step uses `bootstrap`; the selected model remains the turn's visible response model.

**Why this approach:** it keeps the behavior local to the turn loop instead of mutating global session model state.

**Alternative considered:** overwrite the selected model in session state for the first step and then restore it. Rejected because it couples premium optimization to persistent session model state and makes UI/model telemetry harder to reason about.

### 2. Keep the bootstrap step invisible to the user

The bootstrap call is an internal Copilot optimization step. The user should continue to experience the selected model as the active model for the turn, including the assistant response that is surfaced back to the UI.

**Why this approach:** the feature is intended to reduce premium-request usage without changing user-facing model behavior.

**Alternative considered:** allow the bootstrap model to return the final user-visible answer when the turn completes in one step. Rejected because it changes effective model behavior without the user's knowledge.

### 3. Reuse the existing per-turn `interactionID` without creating a second bootstrap-specific identifier

The bootstrap call and all follow-up calls stay inside the same Copilot interaction so the existing header logic can continue to treat the first request as `user` and subsequent requests as `agent`.

**Why this approach:** the premium-saving behavior depends on a single interaction boundary; a second ID would split the turn into multiple Copilot interactions.

**Alternative considered:** mint a separate ID for the bootstrap call. Rejected because it defeats the billing optimization goal.

### 4. Keep fallback behavior conservative

If `gpt-5.4-mini` is not present in the resolved GitHub Copilot model list, the system should use the selected model for all steps and skip the bootstrap override.

**Why this approach:** premium optimization should never make the turn fail just because the bootstrap model is unavailable.

**Alternative considered:** fail the turn when the bootstrap model cannot be resolved. Rejected because the optimization is optional behavior, not a correctness requirement.

## Risks / Trade-offs

- **[First-step planning quality changes]** → The bootstrap model may choose a different first-step plan than the selected model would have chosen. Mitigation: keep the bootstrap internal and ensure the selected model remains responsible for the user-visible response path.
- **[Extra latency from an internal bootstrap step]** → A hidden first call adds one more round-trip before the selected model answers. Mitigation: limit the behavior to GitHub Copilot turns where the premium-count trade-off is worth the latency.
- **[Bootstrap model availability drift]** → Copilot may rename or remove the fixed model. Mitigation: resolve the bootstrap model from the runtime provider list and fall back automatically when absent.

## Migration Plan

No data migration is required. Existing sessions and local model selections remain unchanged. The new behavior only applies to new Copilot turns after deployment.

## Open Questions

- Should the bootstrap model remain hardcoded to `gpt-5.4-mini`, or should a later follow-up make it configurable?