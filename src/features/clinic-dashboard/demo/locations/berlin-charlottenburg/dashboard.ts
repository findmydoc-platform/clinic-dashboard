import { createDemoDashboardSnapshot } from "../../reporting"

export const berlinCharlottenburgDashboard = createDemoDashboardSnapshot({
  profileCompletion: 91,
  profileTasks: [
    {
      actionLabel: "Review team",
      description: "One specialist biography is ready for a final content review.",
      destination: "team",
      destinationLabel: "Open doctors and team",
      id: "berlin-charlottenburg-team-review",
      label: "Review team biography",
      priority: "Medium",
      visibility: "always",
    },
    {
      actionLabel: "Review images",
      description: "Confirm the new cover image before the next public profile update.",
      destination: "gallery",
      destinationLabel: "Open image gallery",
      id: "berlin-charlottenburg-cover-review",
      label: "Confirm cover image",
      priority: "Low",
      visibility: "always",
    },
    {
      actionLabel: "View details",
      description: "One accreditation record is waiting for verification.",
      id: "berlin-charlottenburg-accreditation-review",
      label: "Accreditation review",
      priority: "Medium",
      visibility: "full-interface",
    },
  ],
  rating: {
    categories: ["Aesthetic dentistry", "Dermatology", "Preventive care"],
    count: 486,
    pendingResponses: 1,
    value: 4.6,
  },
  reporting: {
    "7 days": {
      changes: { contacts: "+18.4%", impressions: "+9.8%", inquiries: "+16.7%", views: "+14.2%" },
      reviewActivity: "3 new reviews in the last 7 days",
      series: {
        contacts: [2, 2, 3, 2, 3, 3, 3],
        impressions: [333, 296, 532, 458, 566, 481, 474],
        inquiries: [1, 1, 1, 1, 1, 1, 1],
        uniqueVisitors: [49, 49, 54, 69, 55, 51, 111],
        views: [73, 69, 98, 102, 104, 91, 135],
      },
      totals: { contacts: 18, impressions: 3_140, inquiries: 7, profileViews: 672, uniqueVisitors: 438 },
    },
    "30 days": {
      changes: { contacts: "+21.6%", impressions: "+12.4%", inquiries: "+20.0%", views: "+18.9%" },
      reviewActivity: "12 new reviews in the last 30 days",
      series: {
        contacts: [2, 2, 2, 1, 1, 2, 2, 1, 2, 2, 3, 1, 2, 2, 2, 1, 3, 2, 2, 1, 2, 2, 2, 2, 3, 3, 3, 2, 3, 3],
        impressions: [
          330, 366, 342, 245, 313, 330, 405, 367, 385, 420, 491, 278, 530, 320, 492, 452, 434, 499, 494, 389,
          391, 416, 457, 527, 467, 477, 451, 552, 523, 617,
        ],
        inquiries: [0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
        uniqueVisitors: [
          46, 56, 60, 36, 54, 60, 52, 46, 54, 62, 65, 49, 72, 42, 86, 61, 72, 70, 53, 47, 70, 62, 78, 45, 74,
          62, 71, 61, 57, 57,
        ],
        views: [
          66, 76, 101, 50, 94, 55, 103, 70, 101, 86, 69, 83, 105, 62, 111, 67, 95, 100, 116, 73, 117, 111,
          132, 109, 100, 67, 127, 99, 93, 102,
        ],
      },
      totals: {
        contacts: 61,
        impressions: 12_760,
        inquiries: 24,
        profileViews: 2_740,
        uniqueVisitors: 1_780,
      },
    },
    "90 days": {
      changes: { contacts: "+24.1%", impressions: "+17.2%", inquiries: "+19.2%", views: "+20.5%" },
      reviewActivity: "34 new reviews in the last 90 days",
      series: {
        contacts: [9, 9, 14, 9, 12, 10, 16, 14, 13, 10, 13, 13, 16],
        impressions: [2082, 1680, 2893, 1853, 2640, 1885, 3100, 1997, 3684, 3492, 4132, 2714, 3768],
        inquiries: [4, 4, 4, 4, 4, 3, 5, 5, 7, 4, 7, 4, 7],
        uniqueVisitors: [267, 244, 444, 249, 406, 333, 365, 407, 475, 274, 506, 419, 471],
        views: [469, 404, 542, 428, 475, 667, 873, 423, 641, 462, 693, 504, 839],
      },
      totals: {
        contacts: 158,
        impressions: 35_920,
        inquiries: 62,
        profileViews: 7_420,
        uniqueVisitors: 4_860,
      },
    },
  },
})
