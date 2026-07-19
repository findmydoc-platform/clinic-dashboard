import { createDemoDashboardSnapshot } from "../../reporting"

export const berlinMitteDashboard = createDemoDashboardSnapshot({
  profileCompletion: 82,
  profileTasks: [
    {
      actionLabel: "Review images",
      description: "The public gallery still needs an additional team image before the profile is complete.",
      destination: "gallery",
      destinationLabel: "Open image gallery",
      id: "berlin-mitte-missing-images",
      label: "Missing images",
      priority: "High",
      visibility: "always",
    },
    {
      actionLabel: "Review team",
      description: "Two doctor profiles still need review before the public team section is complete.",
      destination: "team",
      destinationLabel: "Open doctors and team",
      id: "berlin-mitte-open-doctor-profiles",
      label: "Open doctor profiles",
      priority: "Medium",
      visibility: "always",
    },
    {
      actionLabel: "View details",
      description: "Required certificates have not yet been added to this location.",
      id: "berlin-mitte-certificates-required",
      label: "Certificates required",
      priority: "High",
      visibility: "full-interface",
    },
    {
      actionLabel: "View details",
      description: "One certificate is approaching its expiry date and needs review.",
      id: "berlin-mitte-certificate-expiry",
      label: "Certificate expiry",
      priority: "Low",
      visibility: "full-interface",
    },
  ],
  rating: {
    categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: {
    "7 days": {
      changes: {
        contacts: "-7.7%",
        impressions: "+8.4%",
        inquiries: "+25.0%",
        views: "+10.1%",
      },
      reviewActivity: "4 new reviews in the last 7 days",
      series: {
        contacts: [1, 1, 2, 1, 2, 2, 3],
        impressions: [484, 622, 673, 496, 830, 621, 954],
        inquiries: [0, 0, 1, 1, 1, 1, 1],
        uniqueVisitors: [59, 46, 100, 63, 68, 99, 108],
        views: [101, 135, 115, 105, 143, 109, 140],
      },
      totals: { contacts: 12, impressions: 4_680, inquiries: 5, profileViews: 848, uniqueVisitors: 543 },
    },
    "30 days": {
      changes: {
        contacts: "-2.1%",
        impressions: "+5.2%",
        inquiries: "+8.4%",
        views: "+12.0%",
      },
      reviewActivity: "18 new reviews in the last 30 days",
      series: {
        contacts: [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 2, 2, 2, 1, 1, 2, 1, 2, 2, 2, 2],
        impressions: [
          450, 407, 706, 448, 429, 389, 743, 574, 647, 615, 743, 584, 494, 667, 509, 622, 488, 611, 882, 440,
          782, 762, 604, 696, 732, 782, 622, 589, 655, 748,
        ],
        inquiries: [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0],
        uniqueVisitors: [
          51, 52, 57, 53, 61, 60, 79, 60, 74, 74, 80, 46, 54, 72, 78, 68, 68, 70, 82, 77, 62, 52, 85, 84, 94,
          84, 80, 49, 104, 95,
        ],
        views: [
          84, 80, 112, 85, 120, 113, 101, 103, 91, 118, 102, 92, 90, 121, 111, 86, 101, 115, 113, 76, 123,
          114, 165, 134, 145, 110, 164, 95, 107, 113,
        ],
      },
      totals: {
        contacts: 42,
        impressions: 18_420,
        inquiries: 16,
        profileViews: 3_284,
        uniqueVisitors: 2_105,
      },
    },
    "90 days": {
      changes: {
        contacts: "+4.4%",
        impressions: "+11.8%",
        inquiries: "+6.7%",
        views: "+9.6%",
      },
      reviewActivity: "52 new reviews in the last 90 days",
      series: {
        contacts: [7, 9, 9, 9, 9, 6, 9, 7, 12, 8, 11, 8, 14],
        impressions: [3129, 3714, 3729, 3620, 3988, 4545, 6119, 3565, 3934, 3277, 3885, 3469, 6706],
        inquiries: [3, 2, 3, 3, 3, 4, 5, 2, 3, 3, 5, 4, 5],
        uniqueVisitors: [326, 422, 479, 391, 499, 359, 599, 334, 414, 369, 680, 450, 684],
        views: [519, 644, 885, 612, 529, 663, 760, 562, 870, 565, 864, 836, 1101],
      },
      totals: {
        contacts: 118,
        impressions: 53_680,
        inquiries: 45,
        profileViews: 9_410,
        uniqueVisitors: 6_006,
      },
    },
  },
})
