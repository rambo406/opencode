## Context

OpenCode communicates with the GitHub Copilot API (CAPI) through a custom fetch wrapper in `packages/opencode/src/plugin/github-copilot/copilot.ts` and a `chat.headers` plugin hook. The agentic tool loop in `prompt.ts` drives multiple LLM calls per user turn (one per tool-call cycle). Currently:

1. **Fetch wrapper** (`auth.loader.fetch`): Parses the request body to infer `isAgent` by checking if the last message role is `user`. Sets `x-initiator` accordingly.
2. **`chat.headers` hook**: Overrides `x-initiator` to `"agent"` for compaction and subagent sessions.
3. **Missing headers**: `X-Interaction-Id`, `X-Request-Id`, `X-Interaction-Type`, `X-Agent-Task-Id`, and `X-GitHub-Api-Version` are not sent.

The body-sniffing approach in the fetch wrapper is fragile — it checks message role rather than iteration position. The first model call in a turn already has tool-result messages from a prior turn, so the heuristic can misclassify.

## Goals / Non-Goals

**Goals:**
- Only the first model call per fresh user turn sends `X-Initiator: user`; all subsequent calls send `X-Initiator: agent`
- Send `X-Interaction-Id` (stable per user turn), `X-Request-Id` (unique per model call), `X-Interaction-Type`, `X-Agent-Task-Id`, and `X-GitHub-Api-Version` on every Copilot API request
- Subagent sessions and compaction requests always use `X-Initiator: agent`
- Retries always use `X-Initiator: agent`

**Non-Goals:**
- Changing the auth flow or token exchange
- Supporting non-Copilot providers with these headers
- Adding telemetry or usage dashboards for premium request tracking

## Decisions

### 1. Thread iteration metadata via the `chat.headers` hook rather than in the fetch wrapper

**Rationale:** The `chat.headers` hook receives structured input (`sessionID`, `message`, `model`) and is the correct place for business logic. The fetch wrapper should only handle transport-level concerns (auth token, user-agent). Moving billing-header logic to the hook avoids body-parsing heuristics.

**Alternative considered:** Embedding iteration tracking in the fetch wrapper. Rejected because the fetch wrapper lacks session context and requires fragile body parsing.

### 2. Track iteration via the `step` counter already in `runLoop` (prompt.ts)

**Rationale:** `prompt.ts`'s `runLoop` already maintains a `step` counter that increments on each model call. Step 1 is the first LLM call for a user turn. This counter can be threaded into `LLM.StreamInput`, then forwarded to the `chat.headers` hook input.

**Alternative considered:** Adding a separate counter. Rejected — the existing `step` variable is exactly what's needed.

### 3. Generate IDs with `crypto.randomUUID()`

**Rationale:** No new dependency needed. The interaction ID is generated once per `runLoop` invocation (user turn). The request ID is generated per `chat.headers` invocation.

### 4. Remove body-sniffing `isAgent` logic from the fetch wrapper

**Rationale:** The `chat.headers` hook now sets `x-initiator` authoritatively. The fetch wrapper should not override it. The fetch wrapper will still set `x-initiator` as a default but the `chat.headers` hook output takes precedence since it's merged last in `llm.ts`.

**Alternative considered:** Keep both and merge. Rejected — redundant logic causes confusion and potential conflicts.

## Risks / Trade-offs

- **[CAPI may add server-side validation beyond headers]** → Low risk. VS Code uses the same mechanism. If CAPI changes, the impact hits VS Code too, making it likely to be documented.
- **[Identifying as `conversation-agent` interaction type]** → Matches VS Code behavior. If CAPI distinguishes OpenCode from VS Code by other means (e.g., `Editor-Version`), the billing benefit could be revoked. Mitigation: monitor Copilot usage dashboard.
- **[Removing body-sniffing from fetch wrapper]** → The fetch wrapper's `isAgent` default becomes a fallback only. The `chat.headers` hook always overrides for Copilot providers. Risk is minimal since both code paths agree for the common case.
