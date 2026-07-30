import "server-only"

export { handlePatientInquiryStatusUpdate } from "./actions"
export type {
  PatientInquiryChangeError,
  PatientInquiryProvider,
  PatientInquiryProviderFactory,
  PatientInquiryProviderResult,
  PatientInquiryReadError,
} from "./patient-inquiry-provider"
