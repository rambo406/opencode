## ADDED Requirements

### Requirement: First model call per user turn sends X-Initiator user
The system SHALL set the `X-Initiator` header to `"user"` only on the first model call of a fresh user-initiated turn. All subsequent model calls within the same turn (tool-call loop iterations) SHALL set `X-Initiator` to `"agent"`.

#### Scenario: Single user prompt triggers multiple tool calls
- **WHEN** a user sends a prompt that triggers a tool-calling loop with 5 model calls
- **THEN** the first model call has header `X-Initiator: user` and the remaining 4 have `X-Initiator: agent`

#### Scenario: User sends a new prompt after a completed turn
- **WHEN** a user sends a second prompt starting a new turn
- **THEN** the first model call of that new turn has `X-Initiator: user`

### Requirement: Subagent sessions always use X-Initiator agent
The system SHALL set `X-Initiator` to `"agent"` for all model calls in a subagent session (session with a `parentID`), regardless of iteration position.

#### Scenario: Subagent first model call
- **WHEN** a subagent session makes its first model call
- **THEN** the header is `X-Initiator: agent`

### Requirement: Compaction requests always use X-Initiator agent
The system SHALL set `X-Initiator` to `"agent"` for all model calls that are compaction operations.

#### Scenario: Compaction after overflow
- **WHEN** a compaction model call is triggered after context overflow
- **THEN** the header is `X-Initiator: agent`

### Requirement: Stable interaction ID per user turn
The system SHALL generate a UUID (`X-Interaction-Id`) once per user turn and reuse it across all model calls within that turn.

#### Scenario: Multi-step tool loop shares interaction ID
- **WHEN** a user prompt triggers 3 model calls in the tool loop
- **THEN** all 3 requests carry the same `X-Interaction-Id` value

#### Scenario: New turn gets a new interaction ID
- **WHEN** a new user prompt starts a new turn
- **THEN** a new `X-Interaction-Id` UUID is generated, different from the previous turn

### Requirement: Unique request ID per model call
The system SHALL generate a unique UUID for `X-Request-Id` on every model call. The `X-Agent-Task-Id` header SHALL be set to the same value as `X-Request-Id`.

#### Scenario: Each model call has unique request ID
- **WHEN** a turn triggers 3 model calls
- **THEN** each call has a distinct `X-Request-Id` value and `X-Agent-Task-Id` matches `X-Request-Id`

### Requirement: Interaction type and API version headers
The system SHALL send `X-Interaction-Type: conversation-agent` and `X-GitHub-Api-Version: 2025-05-01` on every Copilot API model call.

#### Scenario: Headers present on all Copilot calls
- **WHEN** any model call is made to the Copilot API
- **THEN** the response includes `X-Interaction-Type: conversation-agent` and `X-GitHub-Api-Version: 2025-05-01`

### Requirement: Headers only apply to Copilot provider
The system SHALL only send premium-optimization headers (`X-Initiator`, `X-Interaction-Id`, `X-Request-Id`, `X-Agent-Task-Id`, `X-Interaction-Type`, `X-GitHub-Api-Version`) when the model's `providerID` includes `github-copilot`.

#### Scenario: Non-Copilot provider does not receive headers
- **WHEN** a model call is made to a non-Copilot provider (e.g., `anthropic`)
- **THEN** none of the Copilot premium headers are present in the request
