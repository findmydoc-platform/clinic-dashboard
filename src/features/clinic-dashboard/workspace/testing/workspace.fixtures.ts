import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { ClinicDashboardPrototypeLocation } from "../model/locations"
import type { ClinicDashboardNotification } from "../model/notifications"

export const workspaceAccountFixture = {
  avatar: sarahSchmidtAvatar,
  initials: "SS",
  name: "Sarah Schmidt",
  role: "Clinic administrator",
} as const

export const workspaceOrganizationNameFixture = "Berlin Health Group"

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
] satisfies readonly ClinicDashboardPrototypeLocation[]

export const notificationsFixture = [
  {
    createdAt: "2023-10-12T10:45:00.000Z",
    detail: "Hair transplant inquiry",
    id: "message-lukas-weber",
    timestamp: "Today, 10:45",
    title: "New message from Lukas Weber",
    type: "message",
    unread: true,
  },
  {
    createdAt: "2023-10-11T16:30:00.000Z",
    detail: "Anonymous patient",
    id: "review-response",
    timestamp: "Yesterday",
    title: "New 3-star review needs a response",
    type: "review",
    unread: true,
  },
] satisfies readonly ClinicDashboardNotification[]
