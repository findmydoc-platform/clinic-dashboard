import "server-only"

export {
  evaluateClinicProfileCompleteness,
  evaluateClinicProfileDraftCompleteness,
} from "../model/clinic-profile-completeness"
export type { ClinicTreatmentsSnapshot } from "../model/clinic-treatment"

export {
  handleClinicGalleryDiscard,
  handleClinicGalleryImage,
  handleClinicGalleryRead,
  handleClinicGallerySave,
  handleClinicGalleryUpload,
} from "./clinic-gallery-actions"

export {
  handleClinicTreatmentCreate,
  handleClinicTreatmentRead,
  handleClinicTreatmentUpdate,
} from "./clinic-treatment-actions"
export {
  handleDoctorCreate,
  handleDoctorImageReplace,
  handleDoctorSpecialtyCreate,
  handleDoctorSpecialtyUpdate,
  handleDoctorUpdate,
} from "./actions"
export {
  handleClinicProfileDraftCreate,
  handleClinicProfileDraftDiscard,
  handleClinicProfileDraftSave,
  handleClinicProfileLoad,
  handleClinicProfilePublish,
} from "./clinic-profile-actions"
export type {
  ClinicGalleryProvider,
  ClinicGalleryProviderFactory,
  ClinicGalleryProviderResult,
} from "./clinic-gallery-provider"
export type {
  ClinicProfileProvider,
  ClinicProfileProviderFactory,
  ClinicProfileProviderResult,
} from "./clinic-profile-provider"
export type {
  ClinicTreatmentProvider,
  ClinicTreatmentProviderFactory,
  ClinicTreatmentProviderResult,
} from "./clinic-treatment-provider"
export type {
  DoctorProfileProvider,
  DoctorProfileProviderFactory,
  DoctorProfileProviderResult,
} from "./doctor-profile-provider"
