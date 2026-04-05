import { describe, expect, test } from "bun:test"
import { ACP } from "../../src/acp/agent"

type Entry = { id: string; models: Record<string, { default_variant?: string; variants?: Record<string, any> }> }

describe("modelDefaultVariant", () => {
  const providers: Entry[] = [
    {
      id: "github-copilot",
      models: {
        "gpt-4o": {
          default_variant: "high",
          variants: {
            default: {},
            low: {},
            medium: {},
            high: {},
          },
        },
        "claude-sonnet-4": {
          default_variant: "medium",
          variants: {
            default: {},
            medium: {},
            high: {},
          },
        },
        "gpt-4o-mini": {
          variants: {
            default: {},
            low: {},
          },
        },
        "o3-mini": {},
      },
    },
    {
      id: "anthropic",
      models: {
        "claude-3-5-sonnet": {},
      },
    },
  ]

  test("returns configured default_variant when valid", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "github-copilot" as any,
      modelID: "gpt-4o" as any,
    })
    expect(result).toBe("high")
  })

  test("returns configured default_variant for different model", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "github-copilot" as any,
      modelID: "claude-sonnet-4" as any,
    })
    expect(result).toBe("medium")
  })

  test("returns undefined when no default_variant configured", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "github-copilot" as any,
      modelID: "gpt-4o-mini" as any,
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined when model has no variants at all", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "github-copilot" as any,
      modelID: "o3-mini" as any,
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined when provider not found", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "openai" as any,
      modelID: "gpt-4" as any,
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined when model not found in provider", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "anthropic" as any,
      modelID: "nonexistent" as any,
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined when default_variant is not in available variants", () => {
    const bad: Entry[] = [
      {
        id: "github-copilot",
        models: {
          "gpt-4o": {
            default_variant: "xhigh",
            variants: {
              default: {},
              low: {},
              medium: {},
              high: {},
            },
          },
        },
      },
    ]
    const result = ACP.modelDefaultVariant(bad, {
      providerID: "github-copilot" as any,
      modelID: "gpt-4o" as any,
    })
    expect(result).toBeUndefined()
  })

  test("only returns variant for the correct provider", () => {
    const result = ACP.modelDefaultVariant(providers, {
      providerID: "anthropic" as any,
      modelID: "gpt-4o" as any,
    })
    expect(result).toBeUndefined()
  })

  test("ignores models without reasoning variants", () => {
    const noVariants: Entry[] = [
      {
        id: "github-copilot",
        models: {
          "gpt-4o-mini": { default_variant: "high" },
        },
      },
    ]
    const result = ACP.modelDefaultVariant(noVariants, {
      providerID: "github-copilot" as any,
      modelID: "gpt-4o-mini" as any,
    })
    expect(result).toBeUndefined()
  })
})
