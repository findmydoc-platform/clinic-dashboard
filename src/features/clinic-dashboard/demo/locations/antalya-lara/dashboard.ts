import { createDemoDashboardSnapshot } from "../../reporting"

export const antalyaLaraDashboard = createDemoDashboardSnapshot({
  rating: {
    categories: ["General dermatology", "Skin analysis", "Preventive consultations"],
    count: 92,
    pendingResponses: 1,
    value: 4.9,
  },
  reporting: {
    "7 days": {
      changes: { contacts: "+18.2%", impressions: "+12.8%", inquiries: "+20.0%", views: "+15.6%" },
      reviewActivity: "2 new reviews in the last 7 days",
      series: {
        contacts: [1, 2, 1, 1, 2, 1, 2],
        impressions: [134, 148, 136, 146, 227, 216, 253],
        inquiries: [0, 0, 1, 0, 1, 1, 0],
        uniqueVisitors: [23, 29, 31, 27, 27, 29, 41],
        views: [32, 38, 51, 36, 46, 46, 43],
      },
      totals: { contacts: 10, impressions: 1_260, inquiries: 3, profileViews: 292, uniqueVisitors: 207 },
    },
    "30 days": {
      changes: { contacts: "+19.5%", impressions: "+14.4%", inquiries: "+21.7%", views: "+17.1%" },
      reviewActivity: "7 new reviews in the last 30 days",
      series: {
        contacts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 1, 3, 1, 1, 1, 2, 1, 2, 2, 2, 1],
        impressions: [
          124, 163, 152, 130, 117, 140, 197, 118, 200, 147, 165, 125, 165, 144, 229, 169, 192, 120, 237, 171,
          185, 198, 177, 204, 149, 144, 168, 162, 213, 155,
        ],
        inquiries: [0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
        uniqueVisitors: [
          20, 17, 31, 22, 24, 30, 30, 17, 33, 25, 25, 25, 27, 22, 29, 27, 36, 20, 32, 24, 37, 34, 36, 21, 29,
          21, 32, 20, 28, 30,
        ],
        views: [
          31, 23, 31, 32, 42, 30, 35, 27, 38, 37, 51, 24, 39, 34, 36, 31, 51, 30, 39, 39, 37, 38, 62, 29, 39,
          45, 58, 34, 46, 53,
        ],
      },
      totals: { contacts: 42, impressions: 4_960, inquiries: 13, profileViews: 1_141, uniqueVisitors: 804 },
    },
    "90 days": {
      changes: { contacts: "+22.1%", impressions: "+17.8%", inquiries: "+24.0%", views: "+20.4%" },
      reviewActivity: "19 new reviews in the last 90 days",
      series: {
        contacts: [7, 7, 11, 8, 8, 8, 8, 8, 7, 6, 8, 10, 9],
        impressions: [703, 713, 1114, 853, 886, 738, 1323, 1026, 1027, 1103, 1263, 1052, 1039],
        inquiries: [2, 3, 3, 3, 2, 2, 3, 3, 3, 2, 3, 3, 3],
        uniqueVisitors: [115, 129, 128, 145, 174, 160, 203, 155, 170, 190, 197, 120, 165],
        views: [175, 187, 236, 216, 176, 275, 244, 246, 186, 282, 227, 222, 256],
      },
      totals: {
        contacts: 105,
        impressions: 12_840,
        inquiries: 35,
        profileViews: 2_928,
        uniqueVisitors: 2_051,
      },
    },
  },
})
