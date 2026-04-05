import { NodeFileSystem } from "@effect/platform-node"
import { describe, expect } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { Agent as AgentSvc } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Command } from "../../src/command"
import { Config } from "../../src/config/config"
import { AppFileSystem } from "../../src/filesystem"
import { FileTime } from "../../src/file/time"
import { LSP } from "../../src/lsp"
import { MCP } from "../../src/mcp"
import { Permission } from "../../src/permission"
import { Plugin } from "../../src/plugin"
import { Provider as ProviderSvc } from "../../src/provider/provider"
import type { Provider } from "../../src/provider/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Question } from "../../src/question"
import { Session } from "../../src/session"
import { SessionCompaction } from "../../src/session/compaction"
import { Instruction } from "../../src/session/instruction"
import { LLM } from "../../src/session/llm"
import { SessionProcessor } from "../../src/session/processor"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionStatus } from "../../src/session/status"
import { Snapshot } from "../../src/snapshot"
import { Todo } from "../../src/session/todo"
import { ToolRegistry } from "../../src/tool/registry"
import { Truncate } from "../../src/tool/truncate"
import { Log } from "../../src/util/log"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderTest } from "../fake/provider"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

Log.init({ print: false })

const mcp = Layer.succeed(
  MCP.Service,
  MCP.Service.of({
    status: () => Effect.succeed({}),
    clients: () => Effect.succeed({}),
    tools: () => Effect.succeed({}),
    prompts: () => Effect.succeed({}),
    resources: () => Effect.succeed({}),
    add: () => Effect.succeed({ status: { status: "disabled" as const } }),
    connect: () => Effect.void,
    disconnect: () => Effect.void,
    getPrompt: () => Effect.succeed(undefined),
    readResource: () => Effect.succeed(undefined),
    startAuth: () => Effect.die("unexpected MCP auth in bootstrap tests"),
    authenticate: () => Effect.die("unexpected MCP auth in bootstrap tests"),
    finishAuth: () => Effect.die("unexpected MCP auth in bootstrap tests"),
    removeAuth: () => Effect.void,
    supportsOAuth: () => Effect.succeed(false),
    hasStoredTokens: () => Effect.succeed(false),
    getAuthStatus: () => Effect.succeed("not_authenticated" as const),
  }),
)

const lsp = Layer.succeed(
  LSP.Service,
  LSP.Service.of({
    init: () => Effect.void,
    status: () => Effect.succeed([]),
    hasClients: () => Effect.succeed(false),
    touchFile: () => Effect.void,
    diagnostics: () => Effect.succeed({}),
    hover: () => Effect.succeed(undefined),
    definition: () => Effect.succeed([]),
    references: () => Effect.succeed([]),
    implementation: () => Effect.succeed([]),
    documentSymbol: () => Effect.succeed([]),
    workspaceSymbol: () => Effect.succeed([]),
    prepareCallHierarchy: () => Effect.succeed([]),
    incomingCalls: () => Effect.succeed([]),
    outgoingCalls: () => Effect.succeed([]),
  }),
)

const filetime = Layer.succeed(
  FileTime.Service,
  FileTime.Service.of({
    read: () => Effect.void,
    get: () => Effect.succeed(undefined),
    assert: () => Effect.void,
    withLock: (_filepath, fn) => Effect.promise(fn),
  }),
)

const bus = Bus.layer
const status = SessionStatus.layer.pipe(Layer.provide(bus))
const infra = Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer)

function usage() {
  return {
    inputTokens: 1,
    outputTokens: 1,
    totalTokens: 2,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
  }
}

function stop(input: LLM.StreamInput) {
  return Stream.make(
    { type: "start" } satisfies LLM.Event,
    {
      type: "finish-step",
      finishReason: "stop",
      rawFinishReason: "stop",
      response: {
        id: `res-${input.iteration}`,
        modelId: input.model.id,
        timestamp: new Date(),
      },
      providerMetadata: undefined,
      usage: usage(),
    } satisfies LLM.Event,
    {
      type: "finish",
      finishReason: "stop",
      rawFinishReason: "stop",
      totalUsage: usage(),
    } satisfies LLM.Event,
  )
}

function llm() {
  const hits: LLM.StreamInput[] = []
  const list: Array<Stream.Stream<LLM.Event, unknown> | ((input: LLM.StreamInput) => Stream.Stream<LLM.Event, unknown>)> = []

  return {
    hits: Effect.sync(() => [...hits]),
    push(item: Stream.Stream<LLM.Event, unknown> | ((input: LLM.StreamInput) => Stream.Stream<LLM.Event, unknown>)) {
      list.push(item)
    },
    layer: Layer.succeed(
      LLM.Service,
      LLM.Service.of({
        stream(input) {
          hits.push(input)
          const item = list.shift()
          if (!item) return stop(input)
          return typeof item === "function" ? item(input) : item
        },
      }),
    ),
  }
}

function copilot(boot = true) {
  const pid = ProviderID.make("github-copilot")
  const selected = ProviderTest.model({
    providerID: pid,
    id: ModelID.make("gpt-5.4"),
    name: "GPT-5.4",
    api: {
      id: "gpt-5.4",
      url: "https://api.githubcopilot.com",
      npm: "@ai-sdk/github-copilot",
    },
  })
  const mini = ProviderTest.model({
    providerID: pid,
    id: ModelID.make("gpt-5.4-mini"),
    name: "GPT-5.4 mini",
    api: {
      id: "gpt-5.4-mini",
      url: "https://api.githubcopilot.com",
      npm: "@ai-sdk/github-copilot",
    },
  })
  const all = boot ? [selected, mini] : [selected]
  const info: Provider.Info = {
    id: pid,
    name: "GitHub Copilot",
    source: "config",
    env: [],
    options: {},
    models: Object.fromEntries(all.map((item) => [item.id, item])),
  }

  return {
    selected,
    mini,
    layer: Layer.succeed(
      ProviderSvc.Service,
      ProviderSvc.Service.of({
        list: Effect.fn("TestProvider.list")(() => Effect.succeed({ [info.id]: info })),
        getProvider: Effect.fn("TestProvider.getProvider")((providerID) => {
          if (providerID === info.id) return Effect.succeed(info)
          return Effect.die(new Error(`Unknown test provider: ${providerID}`))
        }),
        getModel: Effect.fn("TestProvider.getModel")((providerID, modelID) => {
          const model = all.find((item) => item.id === modelID)
          if (providerID === info.id && model) return Effect.succeed(model)
          return Effect.die(new Error(`Unknown test model: ${providerID}/${modelID}`))
        }),
        getLanguage: Effect.fn("TestProvider.getLanguage")(() =>
          Effect.die(new Error("bootstrap tests do not use Provider.getLanguage")),
        ),
        closest: Effect.fn("TestProvider.closest")((providerID) =>
          Effect.succeed(providerID === info.id ? { providerID: info.id, modelID: selected.id } : undefined),
        ),
        getSmallModel: Effect.fn("TestProvider.getSmallModel")((providerID) =>
          Effect.succeed(providerID === info.id ? (boot ? mini : selected) : undefined),
        ),
        defaultModel: Effect.fn("TestProvider.defaultModel")(() =>
          Effect.succeed({ providerID: info.id, modelID: selected.id }),
        ),
      }),
    ),
  }
}

function env(llm: Layer.Layer<LLM.Service>, provider: Layer.Layer<ProviderSvc.Service>) {
  const deps = Layer.mergeAll(
    Session.defaultLayer,
    Snapshot.defaultLayer,
    llm,
    AgentSvc.defaultLayer,
    bus,
    Command.defaultLayer,
    Permission.defaultLayer,
    Plugin.defaultLayer,
    Config.defaultLayer,
    provider,
    filetime,
    lsp,
    mcp,
    AppFileSystem.defaultLayer,
    status,
  ).pipe(Layer.provideMerge(infra))
  const question = Question.layer.pipe(Layer.provideMerge(deps))
  const todo = Todo.layer.pipe(Layer.provideMerge(deps))
  const registry = ToolRegistry.layer.pipe(
    Layer.provideMerge(todo),
    Layer.provideMerge(question),
    Layer.provideMerge(deps),
  )
  const trunc = Truncate.layer.pipe(Layer.provideMerge(deps))
  const proc = SessionProcessor.layer.pipe(Layer.provideMerge(deps))
  const compact = SessionCompaction.layer.pipe(Layer.provideMerge(proc), Layer.provideMerge(deps))

  return SessionPrompt.layer.pipe(
    Layer.provideMerge(compact),
    Layer.provideMerge(proc),
    Layer.provideMerge(registry),
    Layer.provideMerge(trunc),
    Layer.provide(Instruction.defaultLayer),
    Layer.provideMerge(deps),
  )
}

describe("session.prompt copilot bootstrap", () => {
  const first = copilot()
  const one = llm()
  const bootstrap = testEffect(env(one.layer, first.layer))

  bootstrap.live("uses a hidden mini bootstrap before the selected model", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({ title: "Pinned" })

          const result = yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: { providerID: first.selected.providerID, modelID: first.selected.id },
            parts: [{ type: "text", text: "hello" }],
          })
          const hits = yield* one.hits

          expect(hits).toHaveLength(2)
          expect(hits[0]?.model.id).toBe(first.mini.id)
          expect(hits[0]?.iteration).toBe(1)
          expect(hits[1]?.model.id).toBe(first.selected.id)
          expect(hits[1]?.iteration).toBe(2)
          expect(hits[0]?.interactionID).toBe(hits[1]?.interactionID)
          expect(result.info.role).toBe("assistant")
          if (result.info.role !== "assistant") return
          expect(result.info.modelID).toBe(first.selected.id)
          expect(result.info.providerID).toBe(first.selected.providerID)
        }),
      { git: true },
    ),
  )

  const second = copilot(false)
  const two = llm()
  const fallback = testEffect(env(two.layer, second.layer))

  fallback.live("falls back to the selected model when the bootstrap model is unavailable", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({ title: "Pinned" })

          const result = yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: { providerID: second.selected.providerID, modelID: second.selected.id },
            parts: [{ type: "text", text: "hello" }],
          })
          const hits = yield* two.hits

          expect(hits).toHaveLength(1)
          expect(hits[0]?.model.id).toBe(second.selected.id)
          expect(hits[0]?.iteration).toBe(1)
          expect(result.info.role).toBe("assistant")
          if (result.info.role !== "assistant") return
          expect(result.info.modelID).toBe(second.selected.id)
          expect(result.info.providerID).toBe(second.selected.providerID)
        }),
      { git: true },
    ),
  )
})