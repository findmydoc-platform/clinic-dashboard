import type { ClinicDashboardNotification } from "../workspace/public"

export const clinicDashboardDemoNotifications = [
  {
    createdAt: "2026-07-19T09:42:00.000Z",
    detail: "Hair transplant inquiry",
    id: "notification-istanbul-levent-eren-yilmaz",
    locationId: "istanbul-levent",
    locationLabel: "İstanbul",
    timestamp: "Today, 09:42",
    target: {
      kind: "messages",
    },
    title: "New message from Eren Yılmaz",
    type: "message",
    unread: true,
  },
  {
    createdAt: "2026-07-19T09:18:00.000Z",
    detail: "Ceramic veneers inquiry",
    id: "notification-izmir-alsancak-leyla-demir",
    locationId: "izmir-alsancak",
    locationLabel: "İzmir",
    timestamp: "Today, 09:18",
    target: {
      kind: "messages",
    },
    title: "New message from Leyla Demir",
    type: "message",
    unread: true,
  },
  {
    createdAt: "2026-07-19T08:54:00.000Z",
    detail: "Dermatology consultation inquiry",
    id: "notification-antalya-lara-ece-arslan",
    locationId: "antalya-lara",
    locationLabel: "Antalya",
    timestamp: "Today, 08:54",
    target: {
      kind: "messages",
    },
    title: "New message from Ece Arslan",
    type: "message",
    unread: true,
  },
  {
    createdAt: "2026-07-18T14:30:00.000Z",
    detail: "Waiting-time feedback needs a response",
    id: "notification-istanbul-levent-review-response",
    locationId: "istanbul-levent",
    locationLabel: "İstanbul",
    timestamp: "Yesterday",
    target: {
      kind: "review",
      reviewId: "istanbul-levent-review-open-waiting-time",
    },
    title: "New 3-star review needs a response",
    type: "review",
    unread: true,
  },
] satisfies readonly ClinicDashboardNotification[]
