import "server-only"

import type {
  PatientInquiryQueueSnapshot,
  PatientInquiryStatus,
  PatientInquiryStatusUpdate,
} from "../model/inquiries"

export type PatientInquiryReadError = "forbidden" | "temporarily-unavailable" | "unauthorized"

export type PatientInquiryChangeError = PatientInquiryReadError | "conflict" | "not-found"

export type PatientInquiryProviderResult<TValue, TError extends string> =
  | Readonly<{
      ok: true
      value: TValue
    }>
  | Readonly<{
      error: TError
      ok: false
    }>

export type PatientInquiryProvider = Readonly<{
  changeStatus: (
    input: Readonly<{
      inquiryId: string
      status: PatientInquiryStatus
    }>,
  ) => Promise<PatientInquiryProviderResult<PatientInquiryStatusUpdate, PatientInquiryChangeError>>
  loadQueue: () => Promise<
    PatientInquiryProviderResult<
      Extract<PatientInquiryQueueSnapshot, Readonly<{ status: "ready" }>>,
      PatientInquiryReadError
    >
  >
}>

export type PatientInquiryProviderFactory = (accessToken: string) => PatientInquiryProvider
