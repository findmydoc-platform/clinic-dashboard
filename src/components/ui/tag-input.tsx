"use client"

import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type TagInputOption = Readonly<{
  label: string
  value: string
}>

type TagInputProps = Readonly<{
  "aria-describedby"?: string
  "aria-errormessage"?: string
  "aria-invalid"?: true
  allowCustomValues?: boolean
  className?: string
  disabled?: boolean
  id: string
  maxValueLength?: number
  maxValues?: number
  onValueChange: (value: readonly string[]) => void
  options?: readonly TagInputOption[]
  placeholder?: string
  required?: true
  value: readonly string[]
}>

function normalizeCustomValue(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function TagInput({
  allowCustomValues = false,
  className,
  disabled = false,
  id,
  maxValueLength,
  maxValues,
  onValueChange,
  options = [],
  placeholder = "Search…",
  value,
  ...ariaProps
}: TagInputProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const portalContainerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )
  const items = useMemo(
    () => Array.from(new Set([...options.map((option) => option.value), ...value])),
    [options, value],
  )

  const addCustomValues = (candidates: readonly string[]) => {
    if (!allowCustomValues) return
    const existingValues = new Set(value.map((item) => item.toLocaleLowerCase()))
    const availableSlots = Math.max(0, (maxValues ?? Number.POSITIVE_INFINITY) - value.length)
    const additions = candidates
      .map(normalizeCustomValue)
      .filter(Boolean)
      .filter((candidate) => !maxValueLength || candidate.length <= maxValueLength)
      .filter((candidate) => {
        const normalizedCandidate = candidate.toLocaleLowerCase()
        if (existingValues.has(normalizedCandidate)) return false
        existingValues.add(normalizedCandidate)
        return true
      })
      .slice(0, availableSlots)
    if (additions.length > 0) onValueChange([...value, ...additions])
    setInputValue("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!allowCustomValues || (event.key !== "Enter" && event.key !== ",")) return
    if (!inputValue.trim()) return
    event.preventDefault()
    addCustomValues([inputValue])
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (!allowCustomValues) return
    const pastedValues = event.clipboardData.getData("text").split(/[,\n]/)
    if (pastedValues.length < 2) return
    event.preventDefault()
    addCustomValues(pastedValues)
  }

  return (
    <div className={cn("relative", className)} ref={portalContainerRef}>
      <ComboboxPrimitive.Root
        disabled={disabled}
        inputValue={inputValue}
        itemToStringLabel={(item) => labelByValue.get(item) ?? item}
        items={items}
        multiple
        onInputValueChange={setInputValue}
        onValueChange={(nextValue) => onValueChange(maxValues ? nextValue.slice(0, maxValues) : nextValue)}
        open={options.length > 0 ? undefined : false}
        value={[...value]}
      >
        <ComboboxPrimitive.Chips
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-sm transition-colors",
            "focus-within:border-[var(--primary)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--primary)]",
            "has-[[aria-invalid=true]]:border-[var(--destructive)] has-[[aria-invalid=true]]:focus-within:outline-[var(--destructive)]",
            disabled && "cursor-not-allowed bg-[var(--surface)] opacity-70",
          )}
          ref={anchorRef}
        >
          {value.map((item) => (
            <ComboboxPrimitive.Chip
              className="flex min-h-7 max-w-full items-center gap-1 rounded-md bg-[var(--surface)] py-1 pr-1 pl-2 text-xs font-bold text-[var(--foreground)]"
              key={item}
            >
              <span className="truncate">{labelByValue.get(item) ?? item}</span>
              <ComboboxPrimitive.ChipRemove
                aria-label={`Remove ${labelByValue.get(item) ?? item}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
                disabled={disabled}
              >
                <X aria-hidden="true" className="size-3.5" />
              </ComboboxPrimitive.ChipRemove>
            </ComboboxPrimitive.Chip>
          ))}
          <ComboboxPrimitive.Input
            {...ariaProps}
            className="min-w-28 flex-1 bg-transparent px-1 py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]"
            id={id}
            maxLength={maxValueLength}
            onBlur={() => {
              if (allowCustomValues && inputValue.trim()) addCustomValues([inputValue])
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={value.length === 0 ? placeholder : undefined}
          />
          {options.length > 0 ? (
            <ComboboxPrimitive.Trigger
              aria-label="Show options"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
              disabled={disabled}
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </ComboboxPrimitive.Trigger>
          ) : null}
        </ComboboxPrimitive.Chips>

        {options.length > 0 ? (
          <ComboboxPrimitive.Portal container={portalContainerRef}>
            <ComboboxPrimitive.Positioner
              align="start"
              anchor={anchorRef}
              className="z-50"
              side="bottom"
              sideOffset={6}
            >
              <ComboboxPrimitive.Popup className="max-h-72 w-[var(--anchor-width)] min-w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-xl">
                <ComboboxPrimitive.Empty className="px-3 py-4 text-center text-sm text-[var(--foreground)]">
                  No options found.
                </ComboboxPrimitive.Empty>
                <ComboboxPrimitive.List
                  aria-label="Available options"
                  className="max-h-72 overflow-y-auto p-1"
                  tabIndex={0}
                >
                  {options.map((option) => (
                    <ComboboxPrimitive.Item
                      className="relative flex min-h-10 cursor-default items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none data-[highlighted]:bg-[var(--surface)] data-[selected]:font-bold"
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                      <ComboboxPrimitive.ItemIndicator className="absolute right-3 inline-flex size-4 items-center justify-center text-[var(--primary)]">
                        <Check aria-hidden="true" className="size-4" />
                      </ComboboxPrimitive.ItemIndicator>
                    </ComboboxPrimitive.Item>
                  ))}
                </ComboboxPrimitive.List>
              </ComboboxPrimitive.Popup>
            </ComboboxPrimitive.Positioner>
          </ComboboxPrimitive.Portal>
        ) : null}
      </ComboboxPrimitive.Root>
    </div>
  )
}
