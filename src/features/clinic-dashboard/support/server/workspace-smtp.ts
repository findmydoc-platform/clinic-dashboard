import "server-only"

import SMTPConnection from "nodemailer/lib/smtp-connection"
import MailComposer from "nodemailer/lib/mail-composer"
import type { SupportRequest, SupportRequestResult } from "../model/support-request"

type SupportMail = SupportRequest & Readonly<{ clinicId: string; clinicName: string; replyEmail: string }>
const sender = "info@findmydoc.eu"
const recipient = "support@findmydoc.eu"

export function sendWorkspaceSupport(input: SupportMail): Promise<SupportRequestResult> {
  const password = process.env.SUPPORT_SMTP_APP_PASSWORD?.replace(/\s/gu, "")
  if (!password || !/^[a-z]{16}$/u.test(password)) return Promise.resolve({ status: "failed" })
  return new Promise((resolve) => {
    let connection: SMTPConnection | undefined
    let submitted = false
    let settled = false
    const finish = (status: SupportRequestResult["status"]) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ status })
      try {
        connection?.close()
      } catch {
        /* The settled outcome remains conservative. */
      }
    }
    const failure = (error?: { responseCode?: number } | null) => {
      finish(
        error?.responseCode && error.responseCode >= 400 && error.responseCode <= 599
          ? "failed"
          : submitted
            ? "unknown"
            : "failed",
      )
    }
    const timer = setTimeout(() => finish(submitted ? "unknown" : "failed"), 20_000)
    try {
      connection = new SMTPConnection({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        name: "clinics.findmydoc.eu",
        tls: { servername: "smtp.gmail.com", rejectUnauthorized: true, minVersion: "TLSv1.2" },
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        dnsTimeout: 5_000,
        socketTimeout: 10_000,
        logger: false,
        debug: false,
      })
      const smtp = connection
      smtp.on("error", failure)
      smtp.on("end", () => {
        if (!settled) failure()
      })
      smtp.connect((error) => {
        if (settled) return
        if (error) return failure(error)
        if (!smtp.secure) return finish("failed")
        smtp.login({ user: sender, pass: password }, (authError) => {
          if (settled) return
          if (authError) return failure(authError)
          try {
            const message = new MailComposer({
              from: sender,
              to: recipient,
              replyTo: input.replyEmail,
              subject: input.subject,
              text: `Clinic: ${input.clinicName}\nClinic ID: ${input.clinicId}\n\n${input.message}`,
              disableFileAccess: true,
              disableUrlAccess: true,
            })
              .compile()
              .createReadStream()
            submitted = true
            smtp.send({ from: sender, to: [recipient] }, message, (sendError, info) => {
              if (settled) return
              if (sendError) return failure(sendError)
              const code = Number(/^([0-9]{3})(?:\s|$)/u.exec(info.response ?? "")?.[1])
              finish(
                code >= 200 &&
                  code < 300 &&
                  info.accepted.length === 1 &&
                  info.accepted[0] === recipient &&
                  info.rejected.length === 0
                  ? "accepted"
                  : code >= 400
                    ? "failed"
                    : "unknown",
              )
            })
          } catch {
            finish(submitted ? "unknown" : "failed")
          }
        })
      })
    } catch {
      finish(submitted ? "unknown" : "failed")
    }
  })
}
