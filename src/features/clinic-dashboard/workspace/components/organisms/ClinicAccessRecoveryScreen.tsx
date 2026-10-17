"use client"

import { useEffect, useRef } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ClinicAccessRecoveryModel } from "../../model/clinic-access-recovery"

export function ClinicAccessRecoveryScreen({
  model,
  onChoose,
  onRefresh,
  onDeclineDiscard,
  onConfirmDiscard,
}: Readonly<{
  model: ClinicAccessRecoveryModel
  onChoose: (clinicId: string) => void
  onRefresh: () => void
  onDeclineDiscard: () => void
  onConfirmDiscard: () => void
}>) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [])
  const busy = model.status === "changing"
  return (
    <main className="flex min-h-dvh items-start justify-center bg-[var(--background)] px-6 py-12 text-[var(--foreground)] sm:py-20">
      <section aria-labelledby="clinic-recovery-heading" className="grid w-full max-w-xl gap-6">
        <div className="grid gap-3">
          <h1
            className="text-2xl font-bold text-[var(--secondary)]"
            id="clinic-recovery-heading"
            ref={heading}
            tabIndex={-1}
          >
            Clinic access has changed
          </h1>
          <p role="alert">
            Work for the previous clinic is restricted. Choose another currently authorized clinic to
            continue.
          </p>
          {model.hasProtectedWork ? (
            <p>Your unfinished work is protected privately until you explicitly discard it.</p>
          ) : null}
        </div>
        {model.status === "loading" ? <p role="status">Checking your current clinic choices…</p> : null}
        {model.status === "unavailable" ? (
          <p role="alert">Clinic choices are temporarily unavailable. Try again.</p>
        ) : null}
        {model.status === "ready" && !model.choices.length ? (
          <p>No other clinics are currently available. Clinic work remains restricted.</p>
        ) : null}
        {model.choices.length ? (
          <div className="grid gap-3" aria-label="Authorized clinic choices">
            {model.choices.map((clinic) => (
              <Button
                className="h-auto min-h-11 w-full justify-start py-3 text-left whitespace-normal"
                disabled={busy}
                key={clinic.id}
                onClick={() => onChoose(clinic.id)}
                variant="outline"
              >
                Open {clinic.name}
              </Button>
            ))}
          </div>
        ) : null}
        {model.status !== "loading" ? (
          <Button
            className="min-h-11 justify-self-start"
            disabled={busy}
            onClick={onRefresh}
            variant="outline"
          >
            Refresh clinic choices
          </Button>
        ) : null}
        {busy ? <p role="status">Opening the selected clinic…</p> : null}
        <AlertDialog
          open={Boolean(model.pendingClinic)}
          title="Discard unfinished clinic work?"
          description={
            <span className="grid gap-3">
              <span>
                Your unfinished work belongs to the previous clinic. Discard it before opening{" "}
                {model.pendingClinic?.name}. It cannot be saved to the selected clinic.
              </span>
              {model.error ? <span role="alert">{model.error}</span> : null}
            </span>
          }
          onOpenChange={(open) => {
            if (!open && !busy) onDeclineDiscard()
          }}
          actions={
            <>
              <Button disabled={busy} onClick={onDeclineDiscard} variant="outline">
                Stay restricted
              </Button>
              <Button disabled={busy} onClick={onConfirmDiscard} variant="destructive">
                Discard and open clinic
              </Button>
            </>
          }
        />
      </section>
    </main>
  )
}
