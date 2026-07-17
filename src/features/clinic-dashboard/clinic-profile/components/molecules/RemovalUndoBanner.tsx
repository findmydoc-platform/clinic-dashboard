import { Button } from "@/components/ui/button"

type RemovalUndoBannerProps = Readonly<{
  isBusy: boolean
  message: string
  onUndo: () => void
}>

export function RemovalUndoBanner({ isBusy, message, onUndo }: RemovalUndoBannerProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))] px-5 py-3 text-sm"
      role="status"
    >
      <span className="font-bold text-[var(--secondary)]">{message}</span>
      <Button disabled={isBusy} onClick={onUndo} size="small" variant="outline">
        Undo removal
      </Button>
    </div>
  )
}
