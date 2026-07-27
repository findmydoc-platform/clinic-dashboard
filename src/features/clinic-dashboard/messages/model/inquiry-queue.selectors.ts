import { filterPatientInquiries, type InquiryQueueViewModel } from "./inquiries"
import type { InquiryQueueState } from "./inquiry-queue.reducer"

export function selectInquiryQueueViewModel(
  state: InquiryQueueState,
  availability: InquiryQueueViewModel["availability"],
): InquiryQueueViewModel {
  const filteredInquiries = filterPatientInquiries(state.inquiries, state.searchQuery)
  const selectedInquiry =
    filteredInquiries.find(({ id }) => id === state.selectedInquiryId) ?? filteredInquiries[0]

  return {
    availability,
    isStatusChangeDisabled: Boolean(state.pendingStatusUpdate),
    isStatusMenuOpen: state.isStatusMenuOpen,
    isUpdatingStatus: state.pendingStatusUpdate?.inquiryId === selectedInquiry?.id,
    mobileInquiryOpen: state.mobilePane === "inquiry",
    newInquiryCount: state.inquiries.filter(({ status }) => status === "submitted").length,
    searchQuery: state.searchQuery,
    selectedInquiry,
    selectedStatusEvents: selectedInquiry
      ? state.statusEvents.filter(({ inquiryId }) => inquiryId === selectedInquiry.id)
      : [],
    statusError:
      state.statusError && state.statusError.inquiryId === selectedInquiry?.id
        ? state.statusError.message
        : undefined,
    statusMessage: state.statusMessage,
    totalInquiryCount: filteredInquiries.length,
    visibleInquiries: filteredInquiries.map((inquiry) => ({
      inquiry,
      isActive: inquiry.id === selectedInquiry?.id,
    })),
  }
}
