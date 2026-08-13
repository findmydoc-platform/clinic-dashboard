"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import {
  ClinicTreatmentCommandError,
  type ClinicTreatmentCommands,
  type ClinicTreatmentCommandErrorCode,
} from "../model/clinic-treatment-commands"

const masterTreatmentSchema = z.object({
  descriptionText: z.string(),
  id: z.string(),
  name: z.string(),
})
const offeringSchema = z.object({
  active: z.boolean(),
  id: z.string(),
  price: z.number().nonnegative(),
  revision: z.string().datetime({ offset: true }),
  treatment: masterTreatmentSchema,
})
const snapshotSchema = z.discriminatedUnion("status", [
  z.object({
    catalogue: z.array(masterTreatmentSchema),
    offerings: z.array(offeringSchema),
    status: z.literal("ready"),
  }),
  z.object({
    catalogue: z.tuple([]),
    offerings: z.tuple([]),
    status: z.enum(["forbidden", "temporarily-unavailable"]),
  }),
])

function commandErrorForStatus(status: number): ClinicTreatmentCommandErrorCode {
  if (status === 403) return "forbidden"
  if (status === 409) return "conflict"
  if (status === 400 || status === 422) return "invalid-input"
  return status >= 500 ? "unknown" : "rejected"
}

async function readSnapshot() {
  let response: Response
  try {
    response = await fetch("/api/dashboard/clinic-treatments", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      redirect: "error",
    })
  } catch {
    throw new ClinicTreatmentCommandError("unknown", "Treatment list outcome is unknown.")
  }

  if (response.status === 403) {
    return { catalogue: [], offerings: [], status: "forbidden" } as const
  }
  if (!response.ok) {
    return { catalogue: [], offerings: [], status: "temporarily-unavailable" } as const
  }

  const parsed = snapshotSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new ClinicTreatmentCommandError("unknown", "Treatment list response was invalid.")
  }
  return parsed.data
}

async function submitJson(method: "PATCH" | "POST", body: unknown, offeringId?: string) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) {
    throw new ClinicTreatmentCommandError("rejected", "Missing request verification.")
  }

  const endpoint = new URL("/api/dashboard/clinic-treatments", window.location.origin)
  if (offeringId) endpoint.searchParams.set("offeringId", offeringId)
  let response: Response
  try {
    response = await fetch(endpoint, {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
      },
      method,
      redirect: "error",
    })
  } catch {
    throw new ClinicTreatmentCommandError("unknown", "Treatment update outcome is unknown.")
  }
  if (!response.ok) {
    throw new ClinicTreatmentCommandError(commandErrorForStatus(response.status), "Treatment update failed.")
  }

  const parsed = offeringSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new ClinicTreatmentCommandError("unknown", "Treatment response was invalid.")
  }
  return parsed.data
}

export function createClinicTreatmentApiCommands(): ClinicTreatmentCommands {
  return {
    createTreatment: (input) => submitJson("POST", input),
    loadTreatments: readSnapshot,
    updateTreatment: (offeringId, input) => submitJson("PATCH", input, offeringId),
  }
}
