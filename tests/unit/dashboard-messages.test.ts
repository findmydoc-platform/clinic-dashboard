import { describe, expect, it } from "vitest"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import {
  createLocalClinicMessage,
  filterConversations,
  getConversationUnreadCount,
  getTotalUnreadCount,
  type ClinicConversation,
} from "@/lib/clinic-dashboard/messages"

describe("dashboard message prototype", () => {
  const conversations = clinicDashboardFixture.messages.conversations

  it("searches existing patient, treatment, and optional category metadata", () => {
    expect(filterConversations(conversations, "Markus").map(({ id }) => id)).toEqual(["markus-schmidt"])
    expect(filterConversations(conversations, "hair transplant").map(({ id }) => id)).toEqual(["lukas-weber"])

    const categorizedConversation: ClinicConversation = {
      id: "clear-aligner",
      initials: "CA",
      name: "Clear Aligner Patient",
      preview: "I have a question about my treatment.",
      section: "New inquiries",
      time: "Now",
      treatment: {
        categoryPath: ["Orthodontics", "Clear aligner"],
        name: "Spark Advanced",
      },
    }

    expect(filterConversations([categorizedConversation], "orthodontics")).toEqual([categorizedConversation])
    expect(filterConversations([categorizedConversation], "spark advanced")).toEqual([
      categorizedConversation,
    ])
  })

  it("derives unread totals without mutating fixture conversations", () => {
    const activeConversation = conversations.find(({ id }) => id === "lukas-weber")
    expect(activeConversation).toBeDefined()
    expect(getTotalUnreadCount(conversations, [])).toBe(1)
    expect(getConversationUnreadCount(activeConversation!, [])).toBe(1)
    expect(getConversationUnreadCount(activeConversation!, ["lukas-weber"])).toBe(0)
    expect(getTotalUnreadCount(conversations, ["lukas-weber"])).toBe(0)
    expect(activeConversation?.unread).toBe(1)
  })

  it("creates a deterministic local clinic message from a controlled draft", () => {
    expect(createLocalClinicMessage("  We can review this tomorrow.  ", 2)).toEqual({
      body: "We can review this tomorrow.",
      id: "local-message-2",
      read: "Read 11:08",
      sender: "clinic",
      time: "11:08",
    })
  })

  it("keeps the fixture treatment-first without inventing category levels", () => {
    const activeConversation = conversations.find(({ id }) => id === "lukas-weber")
    expect(activeConversation?.treatment).toEqual({ name: "Hair transplant" })
  })

  it("keeps fixture identities and active-conversation references consistent", () => {
    const { activeConversationId, messages, patientName } = clinicDashboardFixture.messages
    const activeConversations = conversations.filter(({ id }) => id === activeConversationId)

    expect(activeConversations).toHaveLength(1)
    expect(activeConversations[0]?.name).toBe(patientName)
    expect(new Set(conversations.map(({ id }) => id)).size).toBe(conversations.length)
    expect(new Set(messages.map(({ id }) => id)).size).toBe(messages.length)
  })
})
