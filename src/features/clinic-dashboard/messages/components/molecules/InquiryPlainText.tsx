import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type InquiryPlainTextProps = Readonly<{
  className?: string
  text: string
}>

const urlPattern = /https?:\/\/[^\s<>"']+/giu
const trailingPunctuationPattern = /[.,!?;:)\]}]+$/u

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
  } catch {
    return false
  }
}

function linkifyPlainText(text: string) {
  const content: ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(urlPattern)) {
    const start = match.index
    const raw = match[0]
    const previousCharacter = start > 0 ? text[start - 1] : undefined

    if (previousCharacter && /[\w:/]/u.test(previousCharacter)) continue

    const trailingPunctuation = raw.match(trailingPunctuationPattern)?.[0] ?? ""
    const candidate = trailingPunctuation ? raw.slice(0, -trailingPunctuation.length) : raw
    if (!candidate || !isSafeHttpUrl(candidate)) continue

    if (start > cursor) content.push(text.slice(cursor, start))
    content.push(
      <a
        className="font-bold text-[var(--primary)] underline decoration-1 underline-offset-2 hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        href={candidate}
        key={`${start}-${candidate}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {candidate}
      </a>,
    )
    if (trailingPunctuation) content.push(trailingPunctuation)
    cursor = start + raw.length
  }

  if (cursor < text.length) content.push(text.slice(cursor))
  return content
}

export function InquiryPlainText({ className, text }: InquiryPlainTextProps) {
  return <span className={cn("whitespace-pre-wrap", className)}>{linkifyPlainText(text)}</span>
}
