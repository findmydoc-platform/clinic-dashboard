import "server-only"

import type {
  ClinicProfileDraftCreateInput,
  ClinicProfileDraftDiscardInput,
  ClinicProfileDraftSaveInput,
  ClinicProfilePublishInput,
  ClinicProfileSnapshot,
} from "../model/clinic-profile-source"

export type ClinicProfileReadError = "forbidden" | "invalid-data" | "temporarily-unavailable" | "unauthorized"

export type ClinicProfileChangeError = ClinicProfileReadError | "conflict" | "invalid-input" | "not-found"

export type ClinicProfileProviderResult<TValue, TError extends string> =
  | Readonly<{
      ok: true
      value: TValue
    }>
  | Readonly<{
      error: TError
      ok: false
    }>

export type ClinicProfileProvider = Readonly<{
  createDraft: (
    input: ClinicProfileDraftCreateInput,
  ) => Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, ClinicProfileChangeError>>
  discardDraft: (
    input: ClinicProfileDraftDiscardInput,
  ) => Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, ClinicProfileChangeError>>
  loadSnapshot: () => Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, ClinicProfileReadError>>
  publishDraft: (
    input: ClinicProfilePublishInput,
  ) => Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, ClinicProfileChangeError>>
  saveDraft: (
    input: ClinicProfileDraftSaveInput,
  ) => Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, ClinicProfileChangeError>>
}>

export type ClinicProfileProviderFactory = (accessToken: string, clinicId: string) => ClinicProfileProvider
