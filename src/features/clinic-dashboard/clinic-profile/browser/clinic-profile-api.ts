"use client"

import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import { clinicProfileSourceSnapshotSchema as sourceSnapshotSchema } from "../model/clinic-profile-source-schema"
import {
  ClinicProfileSourceCommandError,
  type ClinicProfileSourceCommands,
} from "../model/clinic-profile-source-commands"

async function parseSnapshot(response: Response) {
  const parsed = sourceSnapshotSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new ClinicProfileSourceCommandError("unknown", "Clinic profile response was invalid.")
  }
  return parsed.data
}

function responseError(response: Response, isMutation = false) {
  if (response.status === 409) {
    return new ClinicProfileSourceCommandError(
      "conflict",
      "The clinic profile changed while it was being edited.",
    )
  }
  if (isMutation && response.status === 404) {
    return new ClinicProfileSourceCommandError("not-found", "The clinic profile draft no longer exists.")
  }
  return new ClinicProfileSourceCommandError(
    isMutation && response.status >= 500 ? "unknown" : "rejected",
    "Clinic profile operation failed.",
  )
}

type ProfileAccessFailure = (failure: "unauthorized" | "forbidden") => void

function reportAccessFailure(response: Response, onAccessFailure?: ProfileAccessFailure) {
  if (response.status === 401) onAccessFailure?.("unauthorized")
  if (response.status === 403) onAccessFailure?.("forbidden")
}

async function loadSnapshot(endpoint: string, onAccessFailure?: ProfileAccessFailure) {
  let response: Response
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    })
  } catch {
    throw new ClinicProfileSourceCommandError("unknown", "Clinic profile load outcome is unknown.")
  }

  reportAccessFailure(response, onAccessFailure)
  if (!response.ok) throw responseError(response)
  return parseSnapshot(response)
}

async function submitJson(
  endpoint: string,
  method: "POST" | "PUT",
  body: unknown,
  onAccessFailure?: ProfileAccessFailure,
) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) {
    throw new ClinicProfileSourceCommandError("rejected", "Missing request verification.")
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
      },
      method,
      redirect: "error",
    })
  } catch {
    throw new ClinicProfileSourceCommandError("unknown", "Clinic profile operation outcome is unknown.")
  }

  reportAccessFailure(response, onAccessFailure)
  if (!response.ok) throw responseError(response, true)
  return parseSnapshot(response)
}

export function createClinicProfileSourceApiCommands(
  clinicId: string,
  onAccessFailure?: ProfileAccessFailure,
): ClinicProfileSourceCommands {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(clinicId)) throw new Error("Invalid profile clinic target")
  const endpoint = `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/profile`
  return {
    createDraft: (input) => submitJson(`${endpoint}/draft`, "POST", input, onAccessFailure),
    discardDraft: (input) => submitJson(`${endpoint}/draft/discard`, "POST", input, onAccessFailure),
    loadSnapshot: () => loadSnapshot(endpoint, onAccessFailure),
    publishDraft: (input) => submitJson(`${endpoint}/publish`, "POST", input, onAccessFailure),
    saveDraft: (input) => submitJson(`${endpoint}/draft`, "PUT", input, onAccessFailure),
  }
}
