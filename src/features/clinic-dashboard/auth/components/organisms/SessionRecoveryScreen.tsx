"use client"

import type { Ref } from "react"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicDashboardReturnTarget } from "../../model/auth"

type SessionRecoveryScreenProps = Readonly<{
  attempt?: string
  csrfToken: string
  formRef?: Ref<HTMLFormElement>
  mode: "refresh" | "clear"
  returnTarget: ClinicDashboardReturnTarget
}>

export function SessionRecoveryScreen({
  attempt = "",
  csrfToken,
  formRef,
  mode,
  returnTarget,
}: SessionRecoveryScreenProps) {
  return (
    <main className="text-foreground flex min-h-dvh items-center justify-center bg-[var(--canvas)] px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <BrandMark className="mb-8" priority />
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Opening your dashboard</h1>
          <p className="text-muted-foreground mt-3" role="status">
            Please wait while we check your session.
          </p>
          <form action="/api/auth/session/recover" method="post" ref={formRef}>
            <input name="attempt" type="hidden" value={attempt} />
            <input name="csrf" type="hidden" value={csrfToken} />
            <input name="next" type="hidden" value={returnTarget} />
            <input name="mode" type="hidden" value={mode} />
            <noscript>
              <p className="mt-4">Select Continue to open your dashboard.</p>
              <Button className="mt-4" type="submit">
                Continue
              </Button>
            </noscript>
          </form>
        </Card>
      </div>
    </main>
  )
}
