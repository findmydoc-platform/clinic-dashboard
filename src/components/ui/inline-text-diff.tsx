import { diffChars } from "diff"

type InlineTextDiffProps = Readonly<{
  after: string
  before: string
}>

export function InlineTextDiff({ after, before }: InlineTextDiffProps) {
  return (
    <span>
      {diffChars(before, after).map((part, index) => {
        if (part.removed) {
          return (
            <del
              className="rounded-sm bg-[var(--surface)] px-0.5 text-[color-mix(in_srgb,var(--foreground)_52%,var(--muted-foreground))] decoration-2"
              key={`${index}-removed`}
            >
              <span className="sr-only">Removed: </span>
              {part.value}
            </del>
          )
        }

        if (part.added) {
          return (
            <ins
              className="rounded-sm bg-[var(--accent-soft)] px-0.5 text-[color-mix(in_srgb,var(--accent)_48%,var(--secondary))] decoration-2 underline-offset-2"
              key={`${index}-added`}
            >
              <span className="sr-only">Added: </span>
              {part.value}
            </ins>
          )
        }

        return <span key={`${index}-unchanged`}>{part.value}</span>
      })}
    </span>
  )
}
