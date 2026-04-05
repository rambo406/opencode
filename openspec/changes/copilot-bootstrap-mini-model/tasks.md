## 1. Turn Bootstrap Resolution

- [x] 1.1 Add logic to resolve a Copilot bootstrap model (`github-copilot/gpt-5.4-mini`) at the start of a user turn
- [x] 1.2 Keep the user-selected model available separately from the bootstrap model for later iterations in the same turn
- [x] 1.3 Add fallback behavior so turns continue on the selected model when the bootstrap model cannot be resolved

## 2. Prompt Loop Model Switching

- [x] 2.1 Update the prompt loop in `packages/opencode/src/session/prompt.ts` so iteration 1 uses the bootstrap model and later iterations use the selected model
- [x] 2.2 Ensure the same interaction ID and iteration tracking continue across the bootstrap call and all later model calls
- [x] 2.3 Ensure the selected model remains the user-visible response model and the bootstrap step stays internal to the turn
- [x] 2.4 Preserve existing non-Copilot, subagent, and compaction behavior while applying the bootstrap override only to eligible Copilot turns

## 3. Validation

- [x] 3.1 Add or update tests for Copilot turns that start on `gpt-5.4-mini` and switch back to the selected model on later iterations
- [x] 3.2 Add or update tests for fallback behavior when the bootstrap model is unavailable
- [x] 3.3 Manually verify Copilot premium-request headers still treat the first call as `user` and later calls as `agent` after the model switch