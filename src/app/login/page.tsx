import type { Metadata } from "next"
import { CircleAlert, LockKeyhole } from "lucide-react"
import { ThemeToggle } from "@/components/molecules/ThemeToggle"
import { BrandMark } from "@/components/atoms/BrandMark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Sign in | Clinic Dashboard",
}

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    error?: string | string[]
  }>
}>

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  const hasInvalidPassword = error === "invalid_password"

  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-6 py-6 text-[var(--foreground)] lg:px-12">
      <header className="mx-auto flex max-w-[1620px] items-center justify-between">
        <BrandMark priority />
        <ThemeToggle showLabel />
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-md items-center justify-center py-10">
        <div className="w-full border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm sm:p-10">
          <div className="flex size-12 items-center justify-center bg-[var(--accent)] text-[var(--secondary)]">
            <LockKeyhole aria-hidden="true" size={22} />
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--secondary)]">Sign in</h1>

          <form action="/api/auth/login" className="mt-8 space-y-5" method="post">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--secondary)]" htmlFor="password">
                Password
              </label>
              <input
                aria-describedby={hasInvalidPassword ? "password-error" : undefined}
                aria-invalid={hasInvalidPassword}
                autoComplete="current-password"
                autoFocus
                className={cn(
                  "flex h-11 w-full rounded-lg border bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-offset-2 placeholder:text-[var(--foreground)] focus-visible:outline-2",
                  hasInvalidPassword
                    ? "border-[var(--destructive)] focus-visible:outline-[var(--destructive)]"
                    : "border-[var(--border)] focus-visible:outline-[var(--primary)]",
                )}
                id="password"
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>

            {hasInvalidPassword ? (
              <p
                className="flex items-center gap-2 text-sm font-bold text-[var(--destructive)]"
                id="password-error"
                role="alert"
              >
                <CircleAlert aria-hidden="true" className="size-4 shrink-0" /> Invalid password.
              </p>
            ) : null}

            <Button className="w-full" size="large" type="submit">
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
