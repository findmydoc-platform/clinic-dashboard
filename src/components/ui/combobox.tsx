"use client"

import { useMemo, useRef, useState } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type ComboboxOption = Readonly<{
  label: string
  value: string
}>

type ComboboxProps = Readonly<{
  "aria-describedby"?: string
  "aria-errormessage"?: string
  "aria-invalid"?: true
  className?: string
  disabled?: boolean
  emptyText?: string
  id: string
  onValueChange: (value: string | undefined) => void
  options: readonly ComboboxOption[]
  placeholder?: string
  required?: true
  value?: string
}>

export function Combobox({
  className,
  disabled = false,
  emptyText = "No options found.",
  id,
  onValueChange,
  options,
  placeholder = "Search…",
  value,
  ...ariaProps
}: ComboboxProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const portalContainerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )

  return (
    <div className={cn("relative", className)} ref={portalContainerRef}>
      <ComboboxPrimitive.Root
        disabled={disabled}
        filter={(item, query) =>
          (labelByValue.get(item) ?? item).toLocaleLowerCase().includes(query.toLocaleLowerCase())
        }
        inputValue={inputValue}
        itemToStringLabel={(item) => labelByValue.get(item) ?? item}
        items={options.map((option) => option.value)}
        onInputValueChange={setInputValue}
        onValueChange={(nextValue) => onValueChange(nextValue ?? undefined)}
        value={value ?? null}
      >
        <div className="relative" ref={anchorRef}>
          <ComboboxPrimitive.Input
            {...ariaProps}
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 pr-12 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-70 aria-invalid:border-[var(--destructive)] aria-invalid:focus:outline-[var(--destructive)]"
            id={id}
            placeholder={value ? labelByValue.get(value) : placeholder}
          />
          <ComboboxPrimitive.Trigger
            aria-label="Show options"
            className="absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
            disabled={disabled}
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </ComboboxPrimitive.Trigger>
        </div>
        <ComboboxPrimitive.Portal container={portalContainerRef}>
          <ComboboxPrimitive.Positioner
            align="start"
            anchor={anchorRef}
            className="z-[60]"
            side="bottom"
            sideOffset={6}
          >
            <ComboboxPrimitive.Popup className="max-h-72 w-[var(--anchor-width)] min-w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-xl">
              <ComboboxPrimitive.Empty className="px-3 py-4 text-center text-sm">
                {emptyText}
              </ComboboxPrimitive.Empty>
              <ComboboxPrimitive.List
                aria-label="Available options"
                className="max-h-72 overflow-y-auto p-1"
                tabIndex={0}
              >
                {(optionValue: string) => {
                  const option = options.find((candidate) => candidate.value === optionValue)
                  if (!option) return null
                  return (
                    <ComboboxPrimitive.Item
                      className="relative flex min-h-11 cursor-default items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none data-[highlighted]:bg-[var(--surface)] data-[selected]:font-bold"
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                      <ComboboxPrimitive.ItemIndicator className="absolute right-3 inline-flex size-4 items-center justify-center text-[var(--primary)]">
                        <Check aria-hidden="true" className="size-4" />
                      </ComboboxPrimitive.ItemIndicator>
                    </ComboboxPrimitive.Item>
                  )
                }}
              </ComboboxPrimitive.List>
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
    </div>
  )
}
