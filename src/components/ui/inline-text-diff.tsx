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
              className="rounded-sm bg-[color-mix(in_srgb,var(--error)_62%,transparent)] px-0.5 text-inherit decoration-2"
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
              className="rounded-sm bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-0.5 text-inherit decoration-2 underline-offset-2"
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
