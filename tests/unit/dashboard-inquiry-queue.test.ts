import { describe, expect, it } from "vitest"
import {
  filterPatientInquiries,
  getPatientInquiryStatusTransitions,
  isAllowedPatientInquiryStatusTransition,
  patientInquiryStatusValues,
} from "@/features/clinic-dashboard/messages/model/inquiries"
import {
  createInquiryQueueState,
  inquiryQueueReducer,
} from "@/features/clinic-dashboard/messages/model/inquiry-queue.reducer"
import { selectInquiryQueueViewModel } from "@/features/clinic-dashboard/messages/model/inquiry-queue.selectors"
import {
  inquiryQueueFixture,
  secondaryInquiryFixture,
} from "@/features/clinic-dashboard/messages/testing/public"

describe("Patient inquiry queue", () => {
  it("filters purpose-specific inquiry fields", () => {
    const inquiries = inquiryQueueFixture.inquiries

    expect(filterPatientInquiries(inquiries, "hair transplant")).toEqual(inquiries)
    expect(filterPatientInquiries(inquiries, "l.weber@example.com")).toEqual(inquiries)
    expect(filterPatientInquiries(inquiries, "unknown")).toEqual([])
  })

  it("matches the complete server-owned forward-only transition contract", () => {
    const expectedTransitions = {
      closed: [],
      contacted: ["closed"],
      in_review: ["contacted", "closed", "spam"],
      spam: [],
      submitted: ["in_review", "contacted", "closed", "spam"],
    } as const

    for (const currentStatus of patientInquiryStatusValues) {
      expect(getPatientInquiryStatusTransitions(currentStatus)).toEqual(expectedTransitions[currentStatus])
      for (const nextStatus of patientInquiryStatusValues) {
        expect(isAllowedPatientInquiryStatusTransition(currentStatus, nextStatus)).toBe(
          expectedTransitions[currentStatus].includes(nextStatus as never),
        )
      }
    }
  })

  it("selects only a visible inquiry and clears details for zero search results", () => {
    const initial = createInquiryQueueState([...inquiryQueueFixture.inquiries, secondaryInquiryFixture])
    const filtered = inquiryQueueReducer(initial, {
      query: "Aylin",
      type: "searchQueryChanged",
    })
    const filteredModel = selectInquiryQueueViewModel(filtered, "ready")

    expect(filtered.selectedInquiryId).toBe(inquiryQueueFixture.inquiries[0]?.id)
    expect(filteredModel.selectedInquiry?.id).toBe(secondaryInquiryFixture.id)
    expect(filteredModel.visibleInquiries).toEqual([{ inquiry: secondaryInquiryFixture, isActive: true }])

    const empty = inquiryQueueReducer(filtered, {
      query: "no matching inquiry",
      type: "searchQueryChanged",
    })
    const emptyModel = selectInquiryQueueViewModel(empty, "ready")

    expect(emptyModel.totalInquiryCount).toBe(0)
    expect(emptyModel.selectedInquiry).toBeUndefined()
    expect(emptyModel.visibleInquiries).toEqual([])
  })

  it("projects a successful status update and a session-only system event", () => {
    const inquiry = inquiryQueueFixture.inquiries[0]
    if (!inquiry) throw new Error("The inquiry queue test requires an inquiry.")

    const initial = createInquiryQueueState(inquiryQueueFixture.inquiries)
    const pending = inquiryQueueReducer(initial, {
      from: "submitted",
      inquiryId: inquiry.id,
      to: "in_review",
      type: "statusUpdateStarted",
    })
    const updated = inquiryQueueReducer(pending, {
      changedAt: "11:08",
      inquiry: {
        ...inquiry,
        availableTransitions: ["contacted", "closed", "spam"],
        status: "in_review",
      },
      type: "statusUpdateSucceeded",
    })
    const model = selectInquiryQueueViewModel(updated, "ready")

    expect(model.selectedInquiry?.status).toBe("in_review")
    expect(model.selectedStatusEvents).toEqual([
      {
        changedAt: "11:08",
        from: "submitted",
        id: `${inquiry.id}:11:08:in_review`,
        inquiryId: inquiry.id,
        to: "in_review",
      },
    ])
    expect(model.statusMessage).toBe("Status changed to In review.")
  })

  it("keeps failed updates out of the inquiry and event state", () => {
    const inquiry = inquiryQueueFixture.inquiries[0]
    if (!inquiry) throw new Error("The inquiry queue test requires an inquiry.")

    const pending = inquiryQueueReducer(createInquiryQueueState(inquiryQueueFixture.inquiries), {
      from: "submitted",
      inquiryId: inquiry.id,
      to: "closed",
      type: "statusUpdateStarted",
    })
    const failed = inquiryQueueReducer(pending, {
      inquiryId: inquiry.id,
      type: "statusUpdateFailed",
    })
    const model = selectInquiryQueueViewModel(failed, "ready")

    expect(model.selectedInquiry?.status).toBe("submitted")
    expect(model.selectedStatusEvents).toEqual([])
    expect(model.statusError).toContain("could not be updated")
  })

  it("scopes pending and failed status state to its inquiry", () => {
    const inquiries = [...inquiryQueueFixture.inquiries, secondaryInquiryFixture]
    const firstInquiry = inquiries[0]
    if (!firstInquiry) throw new Error("The inquiry queue test requires an inquiry.")

    const pending = inquiryQueueReducer(createInquiryQueueState(inquiries), {
      from: firstInquiry.status,
      inquiryId: firstInquiry.id,
      to: "in_review",
      type: "statusUpdateStarted",
    })
    const selectedSecond = inquiryQueueReducer(pending, {
      inquiryId: secondaryInquiryFixture.id,
      type: "inquirySelected",
    })
    const secondModel = selectInquiryQueueViewModel(selectedSecond, "ready")

    expect(secondModel.isStatusChangeDisabled).toBe(true)
    expect(secondModel.isUpdatingStatus).toBe(false)
    expect(secondModel.statusError).toBeUndefined()

    const failed = inquiryQueueReducer(selectedSecond, {
      inquiryId: firstInquiry.id,
      type: "statusUpdateFailed",
    })
    expect(selectInquiryQueueViewModel(failed, "ready").statusError).toBeUndefined()

    const selectedFirst = inquiryQueueReducer(failed, {
      inquiryId: firstInquiry.id,
      type: "inquirySelected",
    })
    expect(selectInquiryQueueViewModel(selectedFirst, "ready").statusError).toContain("could not be updated")
  })
})
