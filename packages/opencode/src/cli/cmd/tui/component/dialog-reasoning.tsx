import { createMemo } from "solid-js"
import { entries, filter, flatMap, map, pipe, sortBy } from "remeda"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { consoleManagedProviderLabel } from "@tui/util/provider-origin"
import { useToast } from "../ui/toast"

type Ref = {
  providerID: string
  modelID: string
}

function label(local: ReturnType<typeof useLocal>, ref: Ref) {
  const cur = local.model.variant.selected(ref)
  if (!cur || cur === "default") return "Default"
  if (local.model.variant.list(ref).includes(cur)) return cur
  return `${cur} (unavailable)`
}

export function DialogReasoning() {
  const dialog = useDialog()
  const local = useLocal()
  const sync = useSync()

  const connected = createMemo(() => new Set(sync.data.provider_next.connected))
  const options = createMemo(() =>
    pipe(
      sync.data.provider,
      filter((provider) => connected().has(provider.id)),
      sortBy((provider) => provider.name),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => !!info.variants && Object.keys(info.variants).length > 0),
          map(([modelID, info]) => ({
            value: { providerID: provider.id, modelID },
            title: info.name ?? modelID,
            category: consoleManagedProviderLabel(
              sync.data.console_state.consoleManagedProviders,
              provider.id,
              provider.name,
            ),
            description: `Default: ${label(local, { providerID: provider.id, modelID })}`,
            onSelect() {
              dialog.replace(() => <DialogReasoningVariant providerID={provider.id} modelID={modelID} />)
            },
          })),
          sortBy((opt) => opt.title),
        ),
      ),
    ),
  )

  return (
    <DialogSelect<Ref>
      title="Configure reasoning defaults"
      options={options()}
      current={local.model.current()}
    />
  )
}

export function DialogReasoningVariant(props: Ref) {
  const dialog = useDialog()
  const local = useLocal()
  const sync = useSync()
  const toast = useToast()

  const provider = createMemo(() => sync.data.provider.find((item) => item.id === props.providerID))
  const info = createMemo(() => provider()?.models[props.modelID])
  const current = createMemo(() => local.model.variant.current(props) ?? "default")
  const title = createMemo(() => {
    const model = info()?.name ?? props.modelID
    return `Reasoning: ${provider()?.name ?? props.providerID}/${model}`
  })

  function set(value: string | undefined) {
    const model = info()?.name ?? props.modelID
    local.model.variant.set(value, props)
    toast.show({
      variant: "success",
      message: value ? `Saved ${model} reasoning as ${value}` : `Reset ${model} reasoning to default`,
    })
    dialog.replace(() => <DialogReasoning />)
  }

  const options = createMemo(() => [
    {
      value: "default",
      title: "Default",
      onSelect() {
        set(undefined)
      },
    },
    ...local.model.variant.list(props).map((item) => ({
      value: item,
      title: item,
      onSelect() {
        set(item)
      },
    })),
  ])

  return <DialogSelect<string> title={title()} options={options()} current={current()} flat={true} />
}