export type MasterTreatment = Readonly<{
  descriptionText: string
  id: string
  name: string
}>

export type ClinicTreatmentOffering = Readonly<{
  active: boolean
  id: string
  price: number
  revision: string
  treatment: MasterTreatment
}>

export type ClinicTreatmentsSnapshot =
  | Readonly<{
      catalogue: readonly MasterTreatment[]
      offerings: readonly ClinicTreatmentOffering[]
      status: "ready"
    }>
  | Readonly<{
      catalogue: readonly []
      offerings: readonly []
      status: "forbidden" | "temporarily-unavailable"
    }>

export type ClinicTreatmentCreateInput = Readonly<{
  price: number
  treatmentId: string
}>

export type ClinicTreatmentUpdateInput = Readonly<{
  active: boolean
  expectedRevision: string
  price: number
}>

export type ClinicTreatmentFormInput = Readonly<{
  active: boolean
  price: number
  treatmentId: string
}>
