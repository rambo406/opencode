import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Select } from "@opencode-ai/ui/select"
import { type Component, For, Show, createMemo } from "solid-js"
import { useLanguage } from "@/context/language"
import { useProviders } from "@/hooks/use-providers"
import { useSDK } from "@/context/sdk"
import { useGlobalSync } from "@/context/global-sync"
import { SettingsList } from "./settings-list"

type ReasoningModel = {
  id: string
  name: string
  variants: string[]
  configured?: string
}

type ProviderGroup = {
  id: string
  name: string
  models: ReasoningModel[]
}

export const SettingsReasoningDefaults: Component = () => {
  const language = useLanguage()
  const providers = useProviders()
  const sdk = useSDK()
  const sync = useGlobalSync()

  const groups = createMemo(() =>
    providers
      .connected()
      .map((p): ProviderGroup => ({
        id: p.id,
        name: p.name,
        models: Object.entries(p.models)
          .filter(([, m]) => m.variants && Object.keys(m.variants).length > 0)
          .map(
            ([, m]): ReasoningModel => ({
              id: m.id,
              name: m.name,
              variants: Object.keys(m.variants!),
              configured: m.default_variant,
            }),
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.models.length > 0),
  )

  const save = async (provider: string, model: string, variant: string | undefined) => {
    const cfg = sync.data.config
    const existing = cfg.provider?.[provider]?.models?.[model] ?? {}
    const updated = variant
      ? { ...existing, default_variant: variant }
      : (() => {
          const { default_variant: _, ...rest } = existing as Record<string, unknown>
          return rest
        })()
    await sdk.client.config.update({
      config: {
        provider: {
          [provider]: {
            models: {
              [model]: updated,
            },
          },
        },
      },
    })
  }

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="flex flex-col gap-4 pt-6 pb-6 max-w-[720px]">
        <h2 class="text-16-medium text-text-strong">{language.t("settings.reasoning.title")}</h2>
        <p class="text-12-regular text-text-weak">{language.t("settings.reasoning.description")}</p>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <Show
          when={groups().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-12 text-center">
              <span class="text-14-regular text-text-weak">{language.t("settings.reasoning.empty")}</span>
            </div>
          }
        >
          <For each={groups()}>
            {(group) => (
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2 pb-2">
                  <ProviderIcon id={group.id} class="size-5 shrink-0 icon-strong-base" />
                  <span class="text-14-medium text-text-strong">{group.name}</span>
                </div>
                <SettingsList>
                  <For each={group.models}>
                    {(model) => {
                      const options = createMemo(() => [
                        { value: undefined as string | undefined, label: language.t("settings.reasoning.default") },
                        ...model.variants.map((v) => ({ value: v as string | undefined, label: v })),
                      ])
                      const current = createMemo(
                        () => options().find((o) => o.value === model.configured) ?? options()[0],
                      )
                      return (
                        <div class="flex flex-wrap items-center gap-4 py-3 border-b border-border-weak-base last:border-none sm:flex-nowrap">
                          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span class="text-14-medium text-text-strong">{model.name}</span>
                          </div>
                          <div class="flex w-full justify-end sm:w-auto sm:shrink-0">
                            <Select
                              options={options()}
                              current={current()}
                              value={(o) => o.value ?? "default"}
                              label={(o) => o.label}
                              onSelect={(o) => o && save(group.id, model.id, o.value)}
                              variant="secondary"
                              size="small"
                              triggerVariant="settings"
                            />
                          </div>
                        </div>
                      )
                    }}
                  </For>
                </SettingsList>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
