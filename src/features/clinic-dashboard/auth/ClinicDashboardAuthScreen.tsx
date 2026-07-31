"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"
import {
  submitClinicDashboardAuthAction,
  type ClinicDashboardAuthApiResult,
  type ClinicDashboardAuthEndpoint,
} from "./browser/auth-api"
import type { ClinicDashboardAuthErrorCode, ClinicDashboardEmailFlow } from "./model/auth"

type AuthAction = (
  endpoint: ClinicDashboardAuthEndpoint,
  body: Record<string, string>,
) => Promise<ClinicDashboardAuthApiResult>

type NavigateAction = (path: string) => void
type LoginSubmissionState = "idle" | "submitting" | "redirecting"

type SharedBasicScreenProps = Readonly<{
  initialError?: ClinicDashboardAuthErrorCode
  initialStatus?: "invite-complete" | "recovery-complete"
  navigateAction?: NavigateAction
  submitAction?: AuthAction
}>

type LoginScreenProps = SharedBasicScreenProps & Readonly<{ mode: "login" }>
type ResetRequestScreenProps = SharedBasicScreenProps & Readonly<{ mode: "reset-request" }>

type ConfirmScreenProps = Readonly<{
  mode: "confirm"
  navigateAction?: NavigateAction
  submitAction?: AuthAction
  type: ClinicDashboardEmailFlow
}>

type PasswordScreenProps = Readonly<{
  flow: ClinicDashboardEmailFlow
  mode: "complete-password"
  navigateAction?: NavigateAction
  submitAction?: AuthAction
}>

type AccessScreenProps = Readonly<{
  clinicName?: string
  mode: "access"
  navigateAction?: NavigateAction
  reloadAction?: () => void
  state: "account-unavailable" | "denied" | "temporarily-unavailable"
  submitAction?: AuthAction
}>

export type ClinicDashboardAuthScreenProps =
  LoginScreenProps | ResetRequestScreenProps | ConfirmScreenProps | PasswordScreenProps | AccessScreenProps

const errorMessages: Record<ClinicDashboardAuthErrorCode, string> = {
  ACCOUNT_UNAVAILABLE: "This account is not available for the clinic dashboard.",
  AUTH_TEMPORARILY_UNAVAILABLE: "Authentication is temporarily unavailable. Please try again.",
  INVALID_CREDENTIALS: "The email address or password is incorrect.",
  INVALID_INPUT: "Please check the information you entered.",
  INVALID_OR_EXPIRED_LINK: "This link is invalid or has expired. Request a new email to continue.",
  REQUEST_REJECTED: "The request could not be verified. Reload the page and try again.",
  SERVICE_TEMPORARILY_UNAVAILABLE: "The service is temporarily unavailable. Please try again.",
}

function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[var(--canvas)] px-4 py-12 text-[var(--foreground)] sm:px-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <BrandMark className="mb-8" priority />
        {children}
      </div>
    </main>
  )
}

function AuthCard({
  children,
  description,
  title,
}: Readonly<{ children: ReactNode; description: string; title: string }>) {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--secondary)]">{title}</h1>
        <p className="mt-2 text-sm leading-6">{description}</p>
      </div>
      {children}
    </Card>
  )
}

function StatusMessage({
  children,
  statusRef,
  tone,
}: Readonly<{
  children: ReactNode
  statusRef?: RefObject<HTMLDivElement | null>
  tone: "error" | "success"
}>) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-sm leading-5",
        tone === "error"
          ? "border-[color-mix(in_srgb,var(--destructive)_42%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))]"
          : "border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--accent-soft)]",
      )}
      ref={statusRef}
      role={tone === "error" ? "alert" : "status"}
      tabIndex={-1}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "error" ? "text-[var(--destructive)]" : "text-[var(--secondary)]",
        )}
      />
      <p>{children}</p>
    </div>
  )
}

function PendingStatus({ children, pending }: Readonly<{ children: ReactNode; pending: boolean }>) {
  if (!pending) return null
  return (
    <p aria-live="polite" className="sr-only" role="status">
      {children}
    </p>
  )
}

function useStatusFocus(active: unknown) {
  const statusRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active) statusRef.current?.focus()
  }, [active])
  return statusRef
}

function getRedirectTarget(
  result: ClinicDashboardAuthApiResult,
):
  | Readonly<{ path: string; status: "redirect" }>
  | Readonly<{ code: ClinicDashboardAuthErrorCode; status: "error" }> {
  if (!result.ok) return { code: result.code, status: "error" }
  const redirectTo = result.body.redirectTo
  if (
    typeof redirectTo !== "string" ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.includes("\\")
  ) {
    return { code: "REQUEST_REJECTED", status: "error" }
  }
  return { path: redirectTo, status: "redirect" }
}

function redirectFromResult(result: ClinicDashboardAuthApiResult, navigateAction: NavigateAction) {
  const redirect = getRedirectTarget(result)
  if (redirect.status === "error") return redirect.code
  navigateAction(redirect.path)
  return undefined
}

const navigateBrowser: NavigateAction = (path) => window.location.assign(path)

function LoginScreen({
  initialError,
  initialStatus,
  navigateAction = navigateBrowser,
  submitAction = submitClinicDashboardAuthAction,
}: LoginScreenProps) {
  const [error, setError] = useState<ClinicDashboardAuthErrorCode | undefined>(initialError)
  const [submissionState, setSubmissionState] = useState<LoginSubmissionState>("idle")
  const pending = submissionState !== "idle"
  const statusRef = useStatusFocus(error ?? initialStatus)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setSubmissionState("submitting")
    const form = new FormData(event.currentTarget)
    const result = await submitAction("/api/auth/login", {
      email: String(form.get("email") ?? ""),
      next: "/",
      password: String(form.get("password") ?? ""),
    })
    const redirect = getRedirectTarget(result)
    if (redirect.status === "error") {
      setError(redirect.code)
      setSubmissionState("idle")
      return
    }

    setSubmissionState("redirecting")
    navigateAction(redirect.path)
  }

  return (
    <AuthCard
      description="Sign in with the clinic staff account linked to your findmydoc clinic."
      title="Sign in to your clinic dashboard"
    >
      {initialStatus ? (
        <div className="mb-5">
          <StatusMessage statusRef={statusRef} tone="success">
            {initialStatus === "invite-complete"
              ? "Your password is set. Sign in to continue."
              : "Your password was reset. Sign in with your new password."}
          </StatusMessage>
        </div>
      ) : null}
      {error ? (
        <div className="mb-5">
          <StatusMessage statusRef={statusRef} tone="error">
            {errorMessages[error]}
          </StatusMessage>
        </div>
      ) : null}
      <form aria-busy={pending} onSubmit={submit}>
        <fieldset className="space-y-5" disabled={pending}>
          <Field isRequired label="Email address">
            {(props) => <Input {...props} autoComplete="email" name="email" type="email" />}
          </Field>
          <Field isRequired label="Password">
            {(props) => <Input {...props} autoComplete="current-password" name="password" type="password" />}
          </Field>
          <Button className="w-full gap-2" disabled={pending} type="submit">
            {submissionState === "idle" ? (
              "Sign in"
            ) : (
              <>
                <RefreshCw aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                {submissionState === "redirecting" ? "Opening dashboard…" : "Signing in…"}
              </>
            )}
          </Button>
        </fieldset>
        <PendingStatus pending={pending}>
          {submissionState === "redirecting" ? "Signed in. Opening your dashboard." : "Signing in."}
        </PendingStatus>
      </form>
      <Link
        aria-disabled={pending}
        className={cn(
          "mt-5 inline-flex text-sm font-bold text-[var(--primary)] hover:underline",
          pending && "pointer-events-none opacity-50",
        )}
        href="/auth/password/reset"
        tabIndex={pending ? -1 : undefined}
      >
        Forgot your password?
      </Link>
    </AuthCard>
  )
}

function ResetRequestScreen({ submitAction = submitClinicDashboardAuthAction }: ResetRequestScreenProps) {
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<ClinicDashboardAuthErrorCode>()
  const [pending, setPending] = useState(false)
  const statusRef = useStatusFocus(error ?? (accepted ? "accepted" : undefined))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const result = await submitAction("/api/auth/password/reset", {
      email: String(form.get("email") ?? ""),
    })
    if (result.ok) setAccepted(true)
    else setError(result.code)
    setPending(false)
  }

  return (
    <AuthCard
      description="Enter your email address. If an eligible account exists, we will send password reset instructions."
      title="Reset your password"
    >
      {accepted ? (
        <StatusMessage statusRef={statusRef} tone="success">
          Check your inbox for the next step. You can close this page safely.
        </StatusMessage>
      ) : (
        <>
          {error ? (
            <div className="mb-5">
              <StatusMessage statusRef={statusRef} tone="error">
                {errorMessages[error]}
              </StatusMessage>
            </div>
          ) : null}
          <form aria-busy={pending} className="space-y-5" onSubmit={submit}>
            <Field isRequired label="Email address">
              {(props) => <Input {...props} autoComplete="email" name="email" type="email" />}
            </Field>
            <Button className="w-full" disabled={pending} type="submit">
              {pending ? "Requesting reset…" : "Send reset instructions"}
            </Button>
            <PendingStatus pending={pending}>Requesting password reset instructions.</PendingStatus>
          </form>
        </>
      )}
      <Link
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
        href="/login"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to sign in
      </Link>
    </AuthCard>
  )
}

function ConfirmScreen({
  navigateAction = navigateBrowser,
  submitAction = submitClinicDashboardAuthAction,
  type,
}: ConfirmScreenProps) {
  const [error, setError] = useState<ClinicDashboardAuthErrorCode>()
  const [pending, setPending] = useState(false)
  const statusRef = useStatusFocus(error)

  const confirm = async () => {
    setError(undefined)
    setPending(true)
    const result = await submitAction("/api/auth/callback", {})
    setError(redirectFromResult(result, navigateAction))
    setPending(false)
  }

  return (
    <AuthCard
      description="For your security, this link is only used after you confirm below."
      title={type === "invite" ? "Accept your clinic invitation" : "Confirm your password reset"}
    >
      {error ? (
        <div className="mb-5">
          <StatusMessage statusRef={statusRef} tone="error">
            {errorMessages[error]}
          </StatusMessage>
        </div>
      ) : null}
      <Button aria-busy={pending} className="w-full" disabled={pending} onClick={confirm}>
        {pending ? "Confirming…" : type === "invite" ? "Continue invitation" : "Continue password reset"}
      </Button>
      <PendingStatus pending={pending}>Confirming email link.</PendingStatus>
      <Link
        className="mt-5 inline-flex text-sm font-bold text-[var(--primary)] hover:underline"
        href="/login"
      >
        Return to sign in
      </Link>
    </AuthCard>
  )
}

function CompletePasswordScreen({
  flow,
  navigateAction = navigateBrowser,
  submitAction = submitClinicDashboardAuthAction,
}: PasswordScreenProps) {
  const [error, setError] = useState<ClinicDashboardAuthErrorCode>()
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [pending, setPending] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const statusRef = useStatusFocus(error)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setPasswordMismatch(false)
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")
    if (password !== confirmPassword) {
      setPasswordMismatch(true)
      passwordRef.current?.focus()
      return
    }

    setPending(true)
    const result = await submitAction(
      flow === "invite" ? "/api/auth/invite/complete" : "/api/auth/password/reset/complete",
      {
        confirmPassword,
        password,
      },
    )
    setError(redirectFromResult(result, navigateAction))
    setPending(false)
  }

  return (
    <AuthCard
      description="Use at least eight characters and enter the same password twice."
      title={flow === "invite" ? "Create your password" : "Choose a new password"}
    >
      {error ? (
        <div className="mb-5">
          <StatusMessage statusRef={statusRef} tone="error">
            {errorMessages[error]}
          </StatusMessage>
        </div>
      ) : null}
      <form aria-busy={pending} className="space-y-5" onSubmit={submit}>
        <Field
          description="Minimum eight characters."
          isInvalid={passwordMismatch}
          isRequired
          label="Password"
        >
          {(props) => (
            <Input
              {...props}
              autoComplete="new-password"
              minLength={8}
              name="password"
              ref={passwordRef}
              type="password"
            />
          )}
        </Field>
        <Field
          error={passwordMismatch ? "Passwords must match." : undefined}
          isRequired
          label="Confirm password"
        >
          {(props) => (
            <Input
              {...props}
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              type="password"
            />
          )}
        </Field>
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Saving password…" : "Save password"}
        </Button>
        <PendingStatus pending={pending}>Saving password.</PendingStatus>
      </form>
    </AuthCard>
  )
}

function AccessScreen({
  clinicName,
  navigateAction = navigateBrowser,
  reloadAction = () => window.location.reload(),
  state,
  submitAction = submitClinicDashboardAuthAction,
}: AccessScreenProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ClinicDashboardAuthErrorCode>()
  const statusRef = useStatusFocus(error)

  const signOut = async () => {
    setPending(true)
    const result = await submitAction("/api/auth/logout", {})
    setError(redirectFromResult(result, navigateAction))
    setPending(false)
  }

  const isOutage = state === "temporarily-unavailable"
  const isAccountUnavailable = state === "account-unavailable"
  return (
    <AuthCard
      description={
        isOutage
          ? "Your session is still active. The clinic service could not be reached right now."
          : isAccountUnavailable
            ? "This account is not available for the clinic dashboard."
            : "Your account is valid, but clinic dashboard access has not been approved or assigned yet."
      }
      title={
        isOutage
          ? "Service temporarily unavailable"
          : isAccountUnavailable
            ? "Account unavailable"
            : "Clinic access pending"
      }
    >
      {clinicName ? <p className="mb-5 text-sm font-bold text-[var(--secondary)]">{clinicName}</p> : null}
      {error ? (
        <div className="mb-5">
          <StatusMessage statusRef={statusRef} tone="error">
            {errorMessages[error]}
          </StatusMessage>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        {isOutage ? (
          <Button className="gap-2" onClick={reloadAction}>
            <RefreshCw aria-hidden="true" className="size-4" /> Try again
          </Button>
        ) : null}
        <Button disabled={pending} onClick={signOut} variant={isOutage ? "outline" : "primary"}>
          {pending ? "Signing out…" : "Sign out"}
        </Button>
        <PendingStatus pending={pending}>Signing out.</PendingStatus>
      </div>
    </AuthCard>
  )
}

export function ClinicDashboardAuthScreen(props: ClinicDashboardAuthScreenProps) {
  let screen: ReactNode
  if (props.mode === "login") screen = <LoginScreen {...props} />
  else if (props.mode === "reset-request") screen = <ResetRequestScreen {...props} />
  else if (props.mode === "confirm") screen = <ConfirmScreen {...props} />
  else if (props.mode === "complete-password") screen = <CompletePasswordScreen {...props} />
  else screen = <AccessScreen {...props} />

  return <AuthLayout>{screen}</AuthLayout>
}
