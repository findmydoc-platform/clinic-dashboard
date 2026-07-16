"use client"

import { useId, useRef, useState, type ChangeEvent, type RefObject } from "react"
import { Mail, MessageCircle, Phone, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ClinicDashboardDataSource } from "@/lib/clinic-dashboard/prototype-data-source"
import {
  supportCategories,
  supportReplyChannels,
  validateSupportRequest,
  type SupportReceipt,
  type SupportRequest,
  type SupportRequestErrors,
} from "@/lib/clinic-dashboard/support"

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

const emptyRequest: SupportRequest = {
  category: "",
  message: "",
  preferredReplyChannel: "Email",
  subject: "",
}

export function SupportDialog({
  dataSource,
  onOpenChange,
  open,
  triggerRef,
}: {
  dataSource: ClinicDashboardDataSource
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerRef?: RefObject<HTMLButtonElement | null>
}) {
  const [request, setRequest] = useState<SupportRequest>(emptyRequest)
  const [errors, setErrors] = useState<SupportRequestErrors>({})
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SupportReceipt>()
  const categoryId = useId()
  const subjectId = useId()
  const messageId = useId()
  const screenshotId = useId()
  const categoryRef = useRef<HTMLSelectElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const screenshotRef = useRef<HTMLInputElement>(null)

  const update = <Key extends keyof SupportRequest>(key: Key, value: SupportRequest[Key]) => {
    setRequest((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError("")
  }

  const selectScreenshot = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    update("screenshot", file ? { name: file.name, size: file.size, type: file.type } : undefined)
  }

  const submit = async () => {
    const nextErrors = validateSupportRequest(request)
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0] as keyof SupportRequestErrors | undefined
    if (firstError) {
      const fields = {
        category: categoryRef,
        message: messageRef,
        screenshot: screenshotRef,
        subject: subjectRef,
      }
      fields[firstError].current?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      setReceipt(await dataSource.submitSupportRequest(request))
    } catch {
      setSubmitError("We couldn't send the support request. Check the details and try again.")
    } finally {
      setSubmitting(false)
    }
  }

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
            <Button disabled={submitting} onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting} onClick={submit}>
              {submitting ? "Sending…" : "Send support request"}
            </Button>
          </div>
        )
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title="Contact support"
      triggerRef={triggerRef}
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
            <fieldset className="mt-4 grid gap-5" disabled={submitting}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold" htmlFor={categoryId}>
                  Category
                  <select
                    aria-describedby={errors.category ? `${categoryId}-error` : undefined}
                    aria-invalid={Boolean(errors.category)}
                    aria-label="Category"
                    className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
                    id={categoryId}
                    onChange={(event) => update("category", event.target.value as SupportRequest["category"])}
                    ref={categoryRef}
                    value={request.category}
                  >
                    <option value="">Select…</option>
                    {supportCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category ? (
                    <span className="text-xs text-[var(--destructive)]" id={`${categoryId}-error`}>
                      {errors.category}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-bold" htmlFor={subjectId}>
                  Subject
                  <input
                    aria-describedby={errors.subject ? `${subjectId}-error` : undefined}
                    aria-invalid={Boolean(errors.subject)}
                    aria-label="Subject"
                    className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
                    id={subjectId}
                    onChange={(event) => update("subject", event.target.value)}
                    ref={subjectRef}
                    value={request.subject}
                  />
                  {errors.subject ? (
                    <span className="text-xs text-[var(--destructive)]" id={`${subjectId}-error`}>
                      {errors.subject}
                    </span>
                  ) : null}
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold" htmlFor={messageId}>
                Message
                <textarea
                  aria-describedby={errors.message ? `${messageId}-error` : undefined}
                  aria-invalid={Boolean(errors.message)}
                  aria-label="Message"
                  className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-normal"
                  id={messageId}
                  onChange={(event) => update("message", event.target.value)}
                  ref={messageRef}
                  value={request.message}
                />
                {errors.message ? (
                  <span className="text-xs text-[var(--destructive)]" id={`${messageId}-error`}>
                    {errors.message}
                  </span>
                ) : null}
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Preferred reply channel
                  <select
                    aria-label="Preferred reply channel"
                    className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
                    onChange={(event) =>
                      update(
                        "preferredReplyChannel",
                        event.target.value as SupportRequest["preferredReplyChannel"],
                      )
                    }
                    value={request.preferredReplyChannel}
                  >
                    {supportReplyChannels.map((channel) => (
                      <option key={channel}>{channel}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold" htmlFor={screenshotId}>
                  Optional screenshot
                  <span className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 font-normal">
                    <Upload aria-hidden="true" className="size-4" />
                    <span className="truncate">{request.screenshot?.name ?? "PNG or JPG, up to 5 MB"}</span>
                  </span>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    aria-describedby={errors.screenshot ? `${screenshotId}-error` : undefined}
                    aria-invalid={Boolean(errors.screenshot)}
                    aria-label="Optional screenshot"
                    className="sr-only"
                    id={screenshotId}
                    onChange={selectScreenshot}
                    ref={screenshotRef}
                    type="file"
                  />
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
