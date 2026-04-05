## Why

When using GitHub Copilot through OpenCode's agentic tool-calling loop, every HTTP request to the model counts as a "premium request." A single user prompt can trigger 5–20+ model calls as tools are invoked and results fed back. VS Code's Copilot Chat avoids this by marking only the first request per turn as `X-Initiator: user` and all subsequent ones as `X-Initiator: agent` — making follow-ups free. OpenCode already has partial support for this header but the logic is incomplete: it infers `isAgent` from the request body shape rather than tracking iteration position in the tool loop, and it lacks supporting headers (`X-Interaction-Id`, `X-Request-Id`, `X-Interaction-Type`) that CAPI expects.

## What Changes

- Add per-request headers (`X-Interaction-Id`, `X-Request-Id`, `X-Interaction-Type`, `X-Agent-Task-Id`, `X-GitHub-Api-Version`) to Copilot API calls via the existing `chat.headers` plugin hook and the custom fetch wrapper in the Copilot auth loader.
- Fix `X-Initiator` logic: currently body-sniffing in the fetch wrapper sets `x-initiator` based on whether the last message role is `user`, and the `chat.headers` hook overrides it for compaction/subagent cases. Instead, thread a proper iteration count from the session loop so `X-Initiator: user` is sent only on the first model call of a fresh user turn — matching VS Code's exact behavior.
- Generate a stable `X-Interaction-Id` (UUID) per user turn, and a unique `X-Request-Id` per model call.

## Capabilities

### New Capabilities
- `copilot-premium-headers`: Send correct premium-request billing headers on every Copilot API call, ensuring only the first model call per user turn counts as a premium request.

### Modified Capabilities

## Impact

- `packages/opencode/src/plugin/github-copilot/copilot.ts` — fetch wrapper and `chat.headers` hook
- `packages/opencode/src/session/llm.ts` — threading iteration metadata into headers
- `packages/opencode/src/session/prompt.ts` — tracking step/iteration count and interaction ID per user turn
- `packages/plugin/src/index.ts` — possibly extending the `chat.headers` hook input type to carry iteration metadata
- No breaking API changes. No new dependencies (UUIDs via `crypto.randomUUID()`).
