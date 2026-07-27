import "server-only"

export { handlePatientInquiryStatusUpdate } from "./actions"
export {
  fetchPatientInquiry,
  fetchPatientInquiryQueue,
  updatePatientInquiryStatus,
} from "./payload-inquiries"
export { getControlledPatientInquiryQueue } from "./controlled-inquiries"
