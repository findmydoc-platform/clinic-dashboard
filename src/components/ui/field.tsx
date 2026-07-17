import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type FieldControlProps = Readonly<{
  "aria-describedby"?: string
  "aria-errormessage"?: string
  "aria-invalid"?: true
  id: string
  required?: true
}>

type FieldProps = Readonly<{
  children: (controlProps: FieldControlProps) => ReactNode
  className?: string
  description?: ReactNode
  error?: ReactNode
  id?: string
  isRequired?: boolean
  label: ReactNode
}>

export function Field({
  children,
  className,
  description,
  error,
  id,
  isRequired = false,
  label,
}: FieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("grid gap-2 text-sm", className)}>
      <div className="flex items-baseline">
        <label className="font-bold text-[var(--foreground)]" htmlFor={controlId}>
          {label}
        </label>
        {isRequired ? (
          <span aria-hidden="true" className="ml-1 font-bold text-[var(--foreground)]">
            *
          </span>
        ) : null}
      </div>
      {children({
        "aria-describedby": describedBy,
        "aria-errormessage": errorId,
        "aria-invalid": error ? true : undefined,
        id: controlId,
        required: isRequired ? true : undefined,
      })}
      {description ? (
        <p className="text-xs font-normal text-[var(--foreground)]" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-bold text-[var(--destructive)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
