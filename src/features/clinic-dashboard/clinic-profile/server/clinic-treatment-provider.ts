import "server-only"

import type {
  ClinicTreatmentCreateInput,
  ClinicTreatmentOffering,
  ClinicTreatmentsSnapshot,
  ClinicTreatmentUpdateInput,
} from "../model/clinic-treatment"

export type ClinicTreatmentReadError = "forbidden" | "temporarily-unavailable" | "unauthorized"

export type ClinicTreatmentChangeError =
  ClinicTreatmentReadError | "conflict" | "invalid-data" | "invalid-input" | "not-found"

export type ClinicTreatmentProviderResult<TValue, TError extends string> =
  Readonly<{ ok: true; value: TValue }> | Readonly<{ error: TError; ok: false }>

export type ClinicTreatmentProvider = Readonly<{
  createTreatment: (
    input: ClinicTreatmentCreateInput,
  ) => Promise<ClinicTreatmentProviderResult<ClinicTreatmentOffering, ClinicTreatmentChangeError>>
  loadTreatments: () => Promise<
    ClinicTreatmentProviderResult<ClinicTreatmentsSnapshot, ClinicTreatmentReadError>
  >
  updateTreatment: (
    offeringId: string,
    input: ClinicTreatmentUpdateInput,
  ) => Promise<ClinicTreatmentProviderResult<ClinicTreatmentOffering, ClinicTreatmentChangeError>>
}>

export type ClinicTreatmentProviderFactory = (
  accessToken: string,
  clinicId: string,
) => ClinicTreatmentProvider
