import { Blocks, GitPullRequest, ShieldCheck } from "lucide-react"
import { EmptyState } from "@/components/molecules/EmptyState"

const foundationItems = [
  {
    description: "Next.js, TypeScript, Storybook, and automated quality checks are in place.",
    icon: Blocks,
    title: "Application foundation",
  },
  {
    description: "Pull requests can publish isolated Vercel previews with visible advisory checks.",
    icon: GitPullRequest,
    title: "Preview delivery",
  },
  {
    description:
      "The temporary first-access guard is active; Supabase sign-in remains planned follow-up work.",
    icon: ShieldCheck,
    title: "Temporary access guard",
  },
] as const

export function FoundationHome() {
  return (
    <>
      <section className="border-b border-[var(--border)] pb-10" aria-labelledby="foundation-title">
        <p className="text-sm font-bold text-[var(--primary)]">Clinic Dashboard</p>
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1
              className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--secondary)] sm:text-5xl"
              id="foundation-title"
            >
              Clinic Dashboard foundation
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              The independent workspace for clinic teams is being prepared. This preview contains no clinic
              data and is protected by a temporary first-access guard.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-bold text-[var(--secondary)]">
            <span aria-hidden="true" className="size-2 bg-[var(--accent)]" />
            Foundation ready
          </div>
        </div>
      </section>

      <section
        aria-label="Foundation status"
        className="mt-8 grid gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] md:grid-cols-3"
      >
        {foundationItems.map(({ description, icon: Icon, title }) => (
          <article className="bg-[var(--background)] p-6" key={title}>
            <Icon aria-hidden="true" className="text-[var(--primary)]" size={24} />
            <h2 className="mt-8 text-lg font-bold text-[var(--secondary)]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          </article>
        ))}
      </section>

      <section aria-label="Clinic modules" className="mt-8">
        <EmptyState
          description="Clinic data and workflows are intentionally outside this foundation release."
          title="No clinic modules connected"
        />
      </section>
    </>
  )
}
