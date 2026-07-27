import { createDemoDashboardSnapshot } from "../../reporting"

export const izmirAlsancakDashboard = createDemoDashboardSnapshot({
  profileCompletion: 91,
  profileTasks: [
    {
      actionLabel: "Review doctors",
      description: "One specialist biography is ready for a final content review.",
      destination: "doctors",
      destinationLabel: "Open doctors",
      id: "izmir-alsancak-doctor-review",
      label: "Review doctor biography",
      priority: "Medium",
      visibility: "always",
    },
    {
      actionLabel: "Review images",
      description: "Confirm the new cover image before the next public profile update.",
      destination: "gallery",
      destinationLabel: "Open image gallery",
      id: "izmir-alsancak-cover-review",
      label: "Confirm cover image",
      priority: "Low",
      visibility: "always",
    },
    {
      actionLabel: "View details",
      description: "One accreditation record is waiting for verification.",
      id: "izmir-alsancak-accreditation-review",
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
      changes: { contacts: "+14.8%", impressions: "+9.6%", inquiries: "+16.7%", views: "+12.4%" },
      reviewActivity: "3 new reviews in the last 7 days",
      series: {
        contacts: [2, 2, 4, 2, 4, 4, 4],
        impressions: [333, 296, 532, 458, 566, 481, 474],
        inquiries: [2, 1, 1, 1, 1, 1, 1],
        uniqueVisitors: [53, 52, 58, 74, 59, 55, 119],
        views: [75, 71, 101, 105, 107, 93, 139],
      },
      totals: { contacts: 22, impressions: 3_140, inquiries: 8, profileViews: 691, uniqueVisitors: 470 },
    },
    "30 days": {
      changes: { contacts: "+16.2%", impressions: "+11.8%", inquiries: "+18.4%", views: "+14.6%" },
      reviewActivity: "12 new reviews in the last 30 days",
      series: {
        contacts: [3, 3, 3, 2, 2, 3, 3, 2, 3, 3, 4, 2, 3, 3, 3, 2, 4, 3, 3, 2, 3, 3, 3, 3, 4, 4, 4, 3, 4, 4],
        impressions: [
          330, 366, 342, 245, 313, 330, 405, 367, 385, 420, 491, 278, 530, 320, 492, 452, 434, 499, 494, 389,
          391, 416, 457, 527, 467, 477, 451, 552, 523, 617,
        ],
        inquiries: [0, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
        uniqueVisitors: [
          49, 60, 64, 39, 58, 64, 56, 49, 58, 66, 70, 52, 77, 45, 92, 65, 77, 75, 57, 50, 75, 66, 84, 48, 79,
          66, 76, 65, 61, 61,
        ],
        views: [
          67, 77, 102, 51, 95, 56, 105, 71, 102, 87, 70, 84, 107, 63, 113, 68, 96, 101, 118, 74, 119, 113,
          134, 111, 101, 68, 129, 100, 94, 104,
        ],
      },
      totals: {
        contacts: 91,
        impressions: 12_760,
        inquiries: 33,
        profileViews: 2_780,
        uniqueVisitors: 1_904,
      },
    },
    "90 days": {
      changes: { contacts: "+19.1%", impressions: "+14.9%", inquiries: "+20.6%", views: "+17.3%" },
      reviewActivity: "34 new reviews in the last 90 days",
      series: {
        contacts: [14, 14, 22, 14, 19, 16, 25, 22, 21, 16, 21, 21, 25],
        impressions: [2082, 1680, 2893, 1853, 2640, 1885, 3100, 1997, 3684, 3492, 4132, 2714, 3768],
        inquiries: [6, 6, 6, 6, 6, 5, 8, 7, 10, 6, 10, 6, 10],
        uniqueVisitors: [292, 267, 485, 272, 444, 364, 399, 445, 519, 300, 553, 458, 515],
        views: [490, 422, 567, 447, 497, 697, 912, 442, 670, 483, 724, 527, 877],
      },
      totals: {
        contacts: 250,
        impressions: 35_920,
        inquiries: 92,
        profileViews: 7_755,
        uniqueVisitors: 5_313,
      },
    },
  },
})
