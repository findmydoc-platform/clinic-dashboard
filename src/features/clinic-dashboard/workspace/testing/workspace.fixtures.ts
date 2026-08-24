import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { ClinicDashboardLocation } from "../model/locations"
import type { ClinicDashboardNotification } from "../model/notifications"

export const workspaceAccountFixture = {
  avatar: sarahSchmidtAvatar,
  initials: "SS",
  name: "Sarah Schmidt",
  role: "Clinic administrator",
  email: "sarah.schmidt@example.com",
} as const

export const authenticatedClinicContextFixture = {
  capabilities: [
    "clinic-profile:view",
    "clinic-profile:edit",
    "clinic-gallery:view",
    "clinic-gallery:edit",
    "clinic-treatments:view",
    "clinic-treatments:edit",
  ],
  clinic: { id: "berlin-health-group", name: "Berlin Health Group" },
  principal: {
    displayName: "Sarah Schmidt",
    email: "sarah.schmidt@example.com",
    id: "clinic-staff-sarah-schmidt",
  },
  status: "approved",
} as const

export const workspaceOrganizationFixture = {
  id: "berlin-health-group-fixture",
  name: "Berlin Health Group",
} as const

export const workspaceLocationFixtures = [
  {
    id: "berlin-mitte",
    location: "Mitte, Berlin",
    name: "Berlin Health Clinic — Mitte",
    selectorLabel: "Mitte",
  },
  {
    id: "berlin-charlottenburg",
    location: "Charlottenburg, Berlin",
    name: "Berlin Health Clinic — Charlottenburg",
    selectorLabel: "Charlottenburg",
  },
  {
    id: "potsdam",
    location: "Potsdam, Brandenburg",
    name: "Berlin Health Clinic — Potsdam",
    selectorLabel: "Potsdam",
  },
] satisfies readonly ClinicDashboardLocation[]

export const notificationsFixture = [
  {
    createdAt: "2023-10-12T10:45:00.000Z",
    detail: "Hair transplant inquiry",
    id: "message-lukas-weber",
    locationId: "berlin-mitte",
    locationLabel: "Mitte",
    timestamp: "Today, 10:45",
    target: { kind: "messages" },
    title: "New message from Lukas Weber",
    type: "message",
    unread: true,
  },
  {
    createdAt: "2023-10-11T16:30:00.000Z",
    detail: "Anonymous patient",
    id: "review-response",
    locationId: "berlin-charlottenburg",
    locationLabel: "Charlottenburg",
    timestamp: "Yesterday",
    target: { kind: "review", reviewId: "charlottenburg-review-markus-schmidt" },
    title: "New 3-star review needs a response",
    type: "review",
    unread: true,
  },
] satisfies readonly ClinicDashboardNotification[]
