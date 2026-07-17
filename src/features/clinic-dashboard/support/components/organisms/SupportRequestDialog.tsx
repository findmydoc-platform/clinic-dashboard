"use client"

import { useId } from "react"
import { Mail, MessageCircle, Phone, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supportCategories, supportReplyChannels, type SupportRequest } from "../../model/support-request"
import { useSupportRequestController } from "../../hooks/useSupportRequestController"
import type { SupportCommands } from "../../model/support-commands"

const directChannels = [
  { href: "tel:+493055500182", icon: Phone, label: "Call", value: "+49 30 5550 0182" },
  {
    href: "https://wa.me/493055500182",
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Message support",
  },
  { href: "mailto:support@example.com", icon: Mail, label: "Email", value: "support@example.com" },
] as const

type SupportRequestDialogProps = Readonly<{
  commands: SupportCommands
  onOpenChange: (open: boolean) => void
  open: boolean
}>

export function SupportRequestDialog({ commands, onOpenChange, open }: SupportRequestDialogProps) {
  const {
    actions,
    model,
    refs: { categoryRef, messageRef, screenshotRef, subjectRef },
  } = useSupportRequestController(commands)
  const { errors, isSubmitting, receipt, request, submitError } = model
  const screenshotId = useId()

  return (
    <Modal
      description="Choose a direct channel or send the prototype support team a structured request."
      footer={
        receipt ? (
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={actions.submit}>
              {isSubmitting ? "Sending…" : "Send support request"}
            </Button>
          </div>
        )
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title="Contact support"
    >
      <div className="space-y-6">
        <section aria-labelledby="direct-support-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-bold text-[var(--secondary)]" id="direct-support-heading">
              Direct support
            </h3>
            <p className="text-xs text-[var(--foreground)]">Mon–Fri, 08:00–18:00 CET</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {directChannels.map(({ href, icon: Icon, label, value }) => (
              <Button asChild className="h-auto justify-start py-3" key={label} variant="outline">
                <a href={href} rel={href.startsWith("http") ? "noreferrer" : undefined}>
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block font-bold">{label}</span>
                    <span className="block truncate text-xs font-normal">{value}</span>
                  </span>
                </a>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[var(--foreground)]">
            Replies are expected within one business day.
          </p>
        </section>

        {receipt ? (
          <section
            className="rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--background))] p-5"
            role="status"
          >
            <h3 className="font-bold text-[var(--secondary)]">Request sent</h3>
            <p className="mt-2 text-sm">
              Prototype ticket <strong>{receipt.ticketId}</strong> was created. Expect a reply{" "}
              {receipt.expectedResponse}.
            </p>
          </section>
        ) : (
          <section aria-labelledby="support-form-heading" className="border-t border-[var(--border)] pt-6">
            <h3 className="font-bold text-[var(--secondary)]" id="support-form-heading">
              Send a message
            </h3>
            <fieldset className="mt-4 grid gap-5" disabled={isSubmitting}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.category} isRequired label="Category">
                  {(controlProps) => (
                    <Select
                      {...controlProps}
                      onValueChange={(value) =>
                        actions.update("category", value as SupportRequest["category"])
                      }
                      ref={categoryRef}
                      value={request.category}
                    >
                      <option value="">Select…</option>
                      {supportCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field error={errors.subject} isRequired label="Subject">
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      onValueChange={(value) => actions.update("subject", value)}
                      ref={subjectRef}
                      value={request.subject}
                    />
                  )}
                </Field>
              </div>
              <Field error={errors.message} isRequired label="Message">
                {(controlProps) => (
                  <Textarea
                    {...controlProps}
                    className="min-h-32"
                    onValueChange={(value) => actions.update("message", value)}
                    ref={messageRef}
                    value={request.message}
                  />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Preferred reply channel">
                  {(controlProps) => (
                    <Select
                      {...controlProps}
                      onValueChange={(value) =>
                        actions.update(
                          "preferredReplyChannel",
                          value as SupportRequest["preferredReplyChannel"],
                        )
                      }
                      value={request.preferredReplyChannel}
                    >
                      {supportReplyChannels.map((channel) => (
                        <option key={channel}>{channel}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <label className="grid gap-2 text-sm font-bold" htmlFor={screenshotId}>
                  Optional screenshot
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    aria-describedby={errors.screenshot ? `${screenshotId}-error` : undefined}
                    aria-invalid={Boolean(errors.screenshot)}
                    aria-label="Optional screenshot"
                    className="peer sr-only"
                    id={screenshotId}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      actions.selectScreenshot(
                        file ? { name: file.name, size: file.size, type: file.type } : undefined,
                      )
                    }}
                    ref={screenshotRef}
                    type="file"
                  />
                  <span className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 font-normal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)]">
                    <Upload aria-hidden="true" className="size-4" />
                    <span className="truncate">{request.screenshot?.name ?? "PNG or JPG, up to 5 MB"}</span>
                  </span>
                  {errors.screenshot ? (
                    <span className="text-xs text-[var(--destructive)]" id={`${screenshotId}-error`}>
                      {errors.screenshot}
                    </span>
                  ) : null}
                </label>
              </div>
            </fieldset>
            {submitError ? (
              <p className="mt-4 text-sm font-bold text-[var(--destructive)]" role="alert">
                {submitError}
              </p>
            ) : null}
          </section>
        )}
      </div>
    </Modal>
  )
}
