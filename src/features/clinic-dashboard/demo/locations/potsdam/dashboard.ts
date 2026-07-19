import { createDemoDashboardSnapshot } from "../../reporting"

export const potsdamDashboard = createDemoDashboardSnapshot({
  profileCompletion: 64,
  profileTasks: [
    {
      actionLabel: "Review images",
      description: "The new location needs a final gallery review before its public launch.",
      destination: "gallery",
      destinationLabel: "Open image gallery",
      id: "potsdam-gallery-review",
      label: "Complete launch gallery",
      priority: "High",
      visibility: "always",
    },
    {
      actionLabel: "Review team",
      description: "Add the remaining practitioner details for the new location.",
      destination: "team",
      destinationLabel: "Open doctors and team",
      id: "potsdam-team-details",
      label: "Complete team profiles",
      priority: "High",
      visibility: "always",
    },
    {
      actionLabel: "View details",
      description: "Required location certificates have not yet been uploaded.",
      id: "potsdam-certificates-required",
      label: "Certificates required",
      priority: "High",
      visibility: "full-interface",
    },
  ],
  rating: {
    categories: ["General dermatology", "Skin analysis", "Preventive consultations"],
    count: 92,
    pendingResponses: 1,
    value: 4.9,
  },
  reporting: {
    "7 days": {
      changes: { contacts: "+42.9%", impressions: "+31.3%", inquiries: "+33.3%", views: "+38.2%" },
      reviewActivity: "2 new reviews in the last 7 days",
      series: {
        contacts: [1, 2, 1, 1, 2, 1, 2],
        impressions: [134, 148, 136, 146, 227, 216, 253],
        inquiries: [0, 0, 1, 0, 1, 1, 1],
        uniqueVisitors: [23, 28, 30, 26, 26, 28, 40],
        views: [32, 37, 50, 35, 45, 45, 42],
      },
      totals: { contacts: 10, impressions: 1_260, inquiries: 4, profileViews: 286, uniqueVisitors: 201 },
    },
    "30 days": {
      changes: { contacts: "+46.2%", impressions: "+36.5%", inquiries: "+50.0%", views: "+41.7%" },
      reviewActivity: "7 new reviews in the last 30 days",
      series: {
        contacts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 2, 2, 1],
        impressions: [
          124, 163, 152, 130, 117, 140, 197, 118, 200, 147, 165, 125, 165, 144, 229, 169, 192, 120, 237, 171,
          185, 198, 177, 204, 149, 144, 168, 162, 213, 155,
        ],
        inquiries: [0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
        uniqueVisitors: [
          19, 16, 29, 21, 23, 28, 28, 16, 31, 24, 24, 24, 25, 21, 27, 25, 34, 19, 30, 23, 35, 32, 34, 20, 27,
          20, 30, 19, 26, 28,
        ],
        views: [
          29, 22, 29, 30, 40, 28, 33, 26, 36, 35, 48, 23, 37, 32, 34, 29, 48, 28, 37, 37, 35, 36, 59, 28, 37,
          43, 55, 32, 44, 50,
        ],
      },
      totals: { contacts: 38, impressions: 4_960, inquiries: 15, profileViews: 1_080, uniqueVisitors: 758 },
    },
    "90 days": {
      changes: { contacts: "+54.2%", impressions: "+48.0%", inquiries: "+56.5%", views: "+51.6%" },
      reviewActivity: "19 new reviews in the last 90 days",
      series: {
        contacts: [6, 6, 9, 7, 7, 7, 7, 7, 6, 5, 7, 9, 8],
        impressions: [703, 713, 1114, 853, 886, 738, 1323, 1026, 1027, 1103, 1263, 1052, 1039],
        inquiries: [2, 3, 3, 3, 2, 2, 4, 3, 3, 2, 3, 3, 3],
        uniqueVisitors: [109, 122, 121, 137, 165, 151, 192, 147, 161, 180, 186, 113, 156],
        views: [165, 176, 223, 204, 166, 259, 230, 232, 175, 266, 214, 209, 241],
      },
      totals: {
        contacts: 91,
        impressions: 12_840,
        inquiries: 36,
        profileViews: 2_760,
        uniqueVisitors: 1_940,
      },
    },
  },
})
