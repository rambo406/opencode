## 1. Extend plugin hook input with iteration metadata

- [x] 1.1 Add `iteration` (number) and `interactionID` (string) fields to the `chat.headers` hook input type in `packages/plugin/src/index.ts`
- [x] 1.2 Thread `step` and a per-turn `interactionID` from `runLoop` in `packages/opencode/src/session/prompt.ts` into `LLM.StreamInput`
- [x] 1.3 Add `iteration` and `interactionID` to the `StreamInput` type in `packages/opencode/src/session/llm.ts`
- [x] 1.4 Forward `iteration` and `interactionID` into the `Plugin.trigger("chat.headers", ...)` call in `llm.ts`

## 2. Implement premium headers in the chat.headers hook

- [x] 2.1 In the `chat.headers` hook in `packages/opencode/src/plugin/github-copilot/copilot.ts`, set `x-initiator` to `"user"` when `incoming.iteration === 1` and `"agent"` otherwise
- [x] 2.2 Keep the existing subagent override (`parentID` check → `x-initiator: agent`) and compaction override
- [x] 2.3 Set `x-interaction-id` from `incoming.interactionID`
- [x] 2.4 Generate a per-request `x-request-id` via `crypto.randomUUID()` and set both `x-request-id` and `x-agent-task-id` to it
- [x] 2.5 Set `x-interaction-type: conversation-agent` and `x-github-api-version: 2025-05-01`

## 3. Clean up fetch wrapper

- [x] 3.1 Remove the body-sniffing `isAgent` logic from the fetch wrapper in `copilot.ts` (`auth.loader.fetch`) — the `chat.headers` hook now handles `x-initiator` authoritatively
- [x] 3.2 Ensure the fetch wrapper still applies `x-initiator` headers passed through from the `chat.headers` hook (they arrive in `init.headers`)

## 4. Generate interaction ID per user turn

- [x] 4.1 In `runLoop` in `prompt.ts`, generate a `crypto.randomUUID()` once before the `while (true)` loop and pass it as `interactionID` in every `handle.process()` call

## 5. Regenerate SDK types

- [x] 5.1 If the `chat.headers` hook input type is part of the generated SDK, regenerate the JS SDK via `./packages/sdk/js/script/build.ts`

## 6. Verification

- [x] 6.1 Run `bun typecheck` from `packages/opencode` to confirm no type errors
- [ ] 6.2 Manually test with debug logging: confirm first request in a multi-tool-call turn has `X-Initiator: user` and all subsequent have `X-Initiator: agent`
- [ ] 6.3 Confirm subagent sessions send `X-Initiator: agent` on all calls
