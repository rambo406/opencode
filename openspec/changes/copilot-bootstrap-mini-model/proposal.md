## Why

GitHub Copilot premium billing is tied to the first user-initiated request in a turn. Today that first request uses the currently selected model, which means expensive model choices still consume a premium turn even when the follow-up agent loop is where most of the work happens.

## What Changes

- Add a hidden Copilot turn-bootstrap flow that always uses `gpt-5.4-mini` for the first user-initiated model call in a turn, regardless of the currently selected model.
- Preserve the same interaction / iteration identity across the turn so all subsequent agent-loop requests continue under the same Copilot interaction.
- Keep the user-selected model as the user-visible model for follow-up tool iterations and final responses after the bootstrap call.
- Add guardrails so the bootstrap behavior only applies when the fixed mini model is available and the active provider is GitHub Copilot.
- Define fallback behavior when `gpt-5.4-mini` is unavailable so normal model selection still works.

## Capabilities

### New Capabilities
- `copilot-bootstrap-model`: bootstrap each Copilot user turn on a fixed mini model in the background, then continue the same interaction on the selected model without exposing the bootstrap step to the user.

### Modified Capabilities

## Impact

- `packages/opencode/src/session/prompt.ts` for turn bootstrapping, interaction reuse, and model switching within the same turn
- `packages/opencode/src/session/llm.ts` for handling the bootstrap model call and subsequent selected-model calls consistently
- `packages/opencode/src/plugin/github-copilot/copilot.ts` for preserving Copilot premium-request header semantics across the bootstrap and follow-up requests
- Possible session / status UI surfaces if the active turn model and selected model need to be distinguished for observability