import { describe, expect, test } from "bun:test"
import { CopilotAuthPlugin } from "../../src/plugin/github-copilot/copilot"
import { ProviderTest } from "../fake/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, SessionID } from "../../src/session/schema"
import type { MessageV2 } from "../../src/session/message-v2"

describe("plugin.github-copilot chat headers", () => {
  test("keeps the interaction id stable and flips initiator after iteration one", async () => {
    const hooks = await CopilotAuthPlugin({
      client: {
        session: {
          message: async () => ({ data: { parts: [] } }),
          get: async () => ({ data: { parentID: undefined } }),
        },
      },
      project: "",
      worktree: "",
      directory: "C:/opencode-test",
      serverUrl: new URL("http://localhost:4096"),
      $: Bun.$,
    } satisfies Parameters<typeof CopilotAuthPlugin>[0])

    const hook = hooks["chat.headers"]
    expect(hook).toBeDefined()
    if (!hook) return

    const model = ProviderTest.model({
      providerID: ProviderID.make("github-copilot"),
      id: ModelID.make("gpt-5.4"),
      api: {
        id: "gpt-5.4",
        url: "https://api.githubcopilot.com",
        npm: "@ai-sdk/github-copilot",
      },
    })
    const message = {
      id: MessageID.make("user-1"),
      sessionID: SessionID.make("session-1"),
      role: "user",
      time: { created: Date.now() },
      agent: "build",
      model: {
        providerID: model.providerID,
        modelID: model.id,
      },
    } satisfies MessageV2.User
    const provider = ProviderTest.info({ id: model.providerID, name: "GitHub Copilot" }, model)
    const interactionID = "interaction-1"

    const first = { headers: {} as Record<string, string> }
    await hook(
      {
        sessionID: message.sessionID,
        agent: "build",
        model,
        provider,
        message,
        iteration: 1,
        interactionID,
      },
      first,
    )

    const second = { headers: {} as Record<string, string> }
    await hook(
      {
        sessionID: message.sessionID,
        agent: "build",
        model,
        provider,
        message,
        iteration: 2,
        interactionID,
      },
      second,
    )

    expect(first.headers["x-initiator"]).toBe("user")
    expect(second.headers["x-initiator"]).toBe("agent")
    expect(first.headers["x-interaction-id"]).toBe(interactionID)
    expect(second.headers["x-interaction-id"]).toBe(interactionID)
  })
})