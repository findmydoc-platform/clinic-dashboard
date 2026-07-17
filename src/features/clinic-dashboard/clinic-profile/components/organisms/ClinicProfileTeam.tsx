import { forwardRef } from "react"
import { Eye, Pencil, Trash2, UserPlus } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicTeamMember } from "../../model/clinic-profile"
import { RemovalUndoBanner } from "../molecules/RemovalUndoBanner"

type ClinicProfileTeamProps = Readonly<{
  isBusy: boolean
  members: readonly ClinicTeamMember[]
  onCreate: () => void
  onMemberOpen: (member: ClinicTeamMember) => void
  onRemove: (id: string) => void
  onUndo: () => void
  showCreateAction: boolean
  showMemberActions: boolean
  showMemberViewAction: boolean
  undoMessage?: string
}>

export const ClinicProfileTeam = forwardRef<HTMLElement, ClinicProfileTeamProps>(function ClinicProfileTeam(
  {
    isBusy,
    members,
    onCreate,
    onMemberOpen,
    onRemove,
    onUndo,
    showCreateAction,
    showMemberActions,
    showMemberViewAction,
    undoMessage,
  },
  ref,
) {
  return (
    <Card
      aria-labelledby="clinic-profile-team-heading"
      className="scroll-mt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      id="clinic-profile-team"
      ref={ref}
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]" id="clinic-profile-team-heading">
          Doctors and team
        </h2>
        {showCreateAction ? (
          <Button disabled={isBusy} onClick={onCreate} variant="ghost">
            <UserPlus aria-hidden="true" className="size-4" /> Add team member
          </Button>
        ) : null}
      </div>
      {undoMessage ? <RemovalUndoBanner isBusy={isBusy} message={undoMessage} onUndo={onUndo} /> : null}
      <div>
        {members.map((member) => (
          <div
            className="flex items-center gap-4 border-b border-[var(--border)] p-5 last:border-0"
            key={member.id}
          >
            <Avatar className="size-14" initials={member.initials} src={member.avatar} />
            <div className="min-w-0 flex-1">
              <strong>{member.name}</strong>
              <p className="mt-1 text-sm text-[var(--foreground)]">{member.specialty}</p>
            </div>
            {showMemberActions ? (
              <div aria-label={`Actions for ${member.name}`} className="flex justify-end gap-1" role="group">
                <Button
                  aria-label={`Edit ${member.name}`}
                  disabled={isBusy}
                  onClick={() => onMemberOpen(member)}
                  size="icon"
                  title={`Edit ${member.name}`}
                  variant="ghost"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={`Remove ${member.name}`}
                  className="text-[var(--destructive)] enabled:hover:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] enabled:hover:text-[var(--destructive)]"
                  disabled={isBusy}
                  onClick={() => onRemove(member.id)}
                  size="icon"
                  title={`Remove ${member.name}`}
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : showMemberViewAction ? (
              <Button
                aria-label={`View ${member.name}`}
                disabled={isBusy}
                onClick={() => onMemberOpen(member)}
                size="small"
                title={`View ${member.name}`}
                variant="ghost"
              >
                <Eye aria-hidden="true" className="size-4" />
                View
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
})
