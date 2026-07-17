import { PageHeading } from "@/components/ui/page-heading"

type FutureAreaPlaceholderScreenProps = Readonly<{
  description: string
  heading: string
}>

export function FutureAreaPlaceholderScreen({ description, heading }: FutureAreaPlaceholderScreenProps) {
  return (
    <section aria-label={heading} className="space-y-6">
      <PageHeading description={description}>{heading}</PageHeading>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xs sm:p-6">
          <div
            aria-hidden="true"
            className="h-4 w-32 max-w-full rounded bg-[var(--border)]"
            data-placeholder-block
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div aria-hidden="true" className="h-28 rounded-lg bg-[var(--surface)]" data-placeholder-block />
            <div aria-hidden="true" className="h-28 rounded-lg bg-[var(--surface)]" data-placeholder-block />
          </div>
          <div aria-hidden="true" className="h-4 w-3/4 rounded bg-[var(--border)]" data-placeholder-block />
          <div aria-hidden="true" className="h-4 w-1/2 rounded bg-[var(--border)]" data-placeholder-block />
        </div>

        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xs sm:p-6">
          <div
            aria-hidden="true"
            className="h-4 w-24 max-w-full rounded bg-[var(--border)]"
            data-placeholder-block
          />
          <div aria-hidden="true" className="h-20 rounded-lg bg-[var(--surface)]" data-placeholder-block />
          <div aria-hidden="true" className="h-4 w-2/3 rounded bg-[var(--border)]" data-placeholder-block />
        </div>
      </div>
    </section>
  )
}
