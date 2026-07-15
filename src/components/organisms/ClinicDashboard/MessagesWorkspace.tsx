"use client"

import { FileImage, MoreVertical, Paperclip, Search, Send, Stethoscope } from "lucide-react"
import { AvatarInitials } from "@/components/atoms/DashboardPrimitives"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import { cn } from "@/lib/utils"

export function MessagesWorkspace({
  onOpenPatientProfile,
  variant,
}: {
  onOpenPatientProfile: () => void
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.messages
  const showMessaging = isGateVisible(variant, "messaging")

  return (
    <div>
      <div className="grid min-h-[calc(100dvh-11rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section
          aria-labelledby="conversation-list-heading"
          className="min-w-0 border-b border-[var(--border)] lg:border-r lg:border-b-0"
        >
          <div className="space-y-4 border-b border-[var(--border)] p-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold" id="conversation-list-heading">
                Messages
              </h1>
              <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-bold text-[var(--on-primary)]">
                3 new
              </span>
            </div>
            {showMessaging ? (
              <label className="relative block">
                <span className="sr-only">Search patients</span>
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--foreground)]"
                />
                <input
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-10 text-sm"
                  placeholder="Search patients…"
                  type="search"
                />
              </label>
            ) : null}
          </div>
          <div>
            {["New inquiries", "Recent chats"].map((section) => (
              <div key={section}>
                <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-2 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                  {section}
                </div>
                {data.conversations
                  .filter((conversation) => conversation.section === section)
                  .map((conversation) => {
                    const active = conversation.id === data.activeConversationId
                    const content = (
                      <>
                        <AvatarInitials
                          className="mr-3 size-12"
                          initials={conversation.initials}
                          src={conversation.avatar}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <strong className="truncate text-sm">{conversation.name}</strong>
                            <span className="text-[11px] text-[var(--foreground)]">{conversation.time}</span>
                          </span>
                          <span className="mt-1 block truncate text-sm text-[var(--foreground)]">
                            {conversation.preview}
                          </span>
                        </span>
                        {"unread" in conversation && conversation.unread ? (
                          <span className="ml-2 rounded-full bg-[var(--primary)] px-2 py-1 text-[10px] font-bold text-[var(--on-primary)]">
                            {conversation.unread}
                          </span>
                        ) : null}
                      </>
                    )
                    return showMessaging ? (
                      <button
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-20 w-full items-center border-b border-[var(--border)] px-5 py-3 text-left",
                          active &&
                            "border-l-4 border-l-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))]",
                        )}
                        key={conversation.id}
                        type="button"
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-20 items-center border-b border-[var(--border)] px-5 py-3",
                          active &&
                            "border-l-4 border-l-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))]",
                        )}
                        key={conversation.id}
                      >
                        {content}
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label={`Conversation with ${data.patientName}`}
          className="flex min-h-[42rem] min-w-0 flex-col"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
            <div className="flex items-center gap-3">
              <AvatarInitials className="size-12" initials="LW" src={data.patientAvatar} />
              <div>
                <h2 className="text-xl font-bold">{data.patientName}</h2>
                <p className="flex items-center gap-1 text-sm text-[var(--foreground)]">
                  <Stethoscope aria-hidden="true" className="size-4" /> Interest:{" "}
                  <strong className="text-[var(--foreground)]">{data.interest}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onOpenPatientProfile} variant="outline">
                View patient profile
              </Button>
              {showMessaging ? (
                <Button aria-label="Conversation menu" size="icon" variant="ghost">
                  <MoreVertical aria-hidden="true" className="size-5" />
                </Button>
              ) : null}
            </div>
          </header>
          <div className="flex-1 space-y-6 overflow-y-auto bg-[var(--canvas)] p-4 sm:p-6">
            <div className="text-center">
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                {data.dateLabel}
              </span>
            </div>
            {data.messages.map((message, index) => (
              <div className={cn("flex", message.sender === "clinic" && "justify-end")} key={message.id}>
                <div
                  className={cn("max-w-[85%] sm:max-w-[70%]", message.sender === "clinic" && "text-right")}
                >
                  <div
                    className={cn(
                      "rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left text-sm leading-6 shadow-sm",
                      message.sender === "clinic" &&
                        "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]",
                    )}
                  >
                    {message.body}
                    {index === 2 ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface)] p-3">
                        <FileImage aria-hidden="true" className="size-5" /> 3 photos
                      </div>
                    ) : null}
                  </div>
                  <span className="mt-1 block text-xs text-[var(--foreground)]">
                    {message.time}
                    {"read" in message && message.read ? ` · ${message.read}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {showMessaging ? (
            <footer className="border-t border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Button aria-label="Attach file" size="icon" variant="ghost">
                  <Paperclip aria-hidden="true" className="size-5" />
                </Button>
                <textarea
                  aria-label="Write a message"
                  className="min-h-11 flex-1 resize-none rounded-lg border border-[var(--border)] p-3 text-sm"
                  placeholder="Write a message…"
                  rows={1}
                />
                <Button aria-label="Send message" size="icon">
                  <Send aria-hidden="true" className="size-5" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[var(--primary)]">
                <button type="button">Use template</button>
                <button type="button">Add internal note</button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>
    </div>
  )
}
