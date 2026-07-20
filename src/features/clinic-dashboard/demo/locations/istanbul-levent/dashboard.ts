import { createDemoDashboardSnapshot } from "../../reporting"

export const istanbulLeventDashboard = createDemoDashboardSnapshot({
  profileCompletion: 82,
  profileTasks: [
    {
      actionLabel: "Review images",
      description: "The public gallery still needs an additional team image before the profile is complete.",
      destination: "gallery",
      destinationLabel: "Open image gallery",
      id: "istanbul-levent-missing-images",
      label: "Missing images",
      priority: "High",
      visibility: "always",
    },
    {
      actionLabel: "Review team",
      description: "Two doctor profiles still need review before the public team section is complete.",
      destination: "team",
      destinationLabel: "Open doctors and team",
      id: "istanbul-levent-open-doctor-profiles",
      label: "Open doctor profiles",
      priority: "Medium",
      visibility: "always",
    },
    {
      actionLabel: "View details",
      description: "Required certificates have not yet been added to this location.",
      id: "istanbul-levent-certificates-required",
      label: "Certificates required",
      priority: "High",
      visibility: "full-interface",
    },
    {
      actionLabel: "View details",
      description: "One certificate is approaching its expiry date and needs review.",
      id: "istanbul-levent-certificate-expiry",
      label: "Certificate expiry",
      priority: "Low",
      visibility: "full-interface",
    },
  ],
  rating: {
    categories: ["Hair transplant", "Dermatology", "Skin analysis"],
    count: 1_248,
    pendingResponses: 1,
    value: 4.8,
  },
  reporting: {
    "7 days": {
      changes: {
        contacts: "+9.5%",
        impressions: "+6.8%",
        inquiries: "+11.1%",
        views: "+8.7%",
      },
      reviewActivity: "4 new reviews in the last 7 days",
      series: {
        contacts: [2, 2, 5, 2, 5, 4, 7],
        impressions: [484, 622, 673, 496, 830, 621, 954],
        inquiries: [0, 0, 2, 2, 2, 2, 1],
        uniqueVisitors: [71, 55, 120, 75, 82, 119, 130],
        views: [113, 150, 128, 117, 159, 122, 156],
      },
      totals: { contacts: 27, impressions: 4_680, inquiries: 9, profileViews: 945, uniqueVisitors: 652 },
    },
    "30 days": {
      changes: {
        contacts: "+8.6%",
        impressions: "+5.4%",
        inquiries: "+10.3%",
        views: "+7.9%",
      },
      reviewActivity: "18 new reviews in the last 30 days",
      series: {
        contacts: [3, 3, 5, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 5, 2, 5, 2, 5, 5, 5, 5, 2, 2, 5, 2, 5, 5, 5, 5],
        impressions: [
          450, 407, 706, 448, 429, 389, 743, 574, 647, 615, 743, 584, 494, 667, 509, 622, 488, 611, 882, 440,
          782, 762, 604, 696, 732, 782, 622, 589, 655, 748,
        ],
        inquiries: [0, 0, 3, 0, 3, 0, 3, 0, 2, 0, 2, 0, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 0, 0, 2, 2, 2, 2, 0],
        uniqueVisitors: [
          62, 63, 69, 64, 74, 72, 95, 72, 89, 89, 96, 55, 65, 87, 94, 82, 82, 84, 99, 93, 75, 63, 102, 101,
          113, 101, 96, 59, 125, 114,
        ],
        views: [
          95, 90, 126, 96, 135, 127, 114, 116, 103, 133, 115, 104, 101, 136, 125, 97, 114, 130, 127, 86, 139,
          129, 186, 151, 163, 124, 185, 107, 121, 127,
        ],
      },
      totals: {
        contacts: 104,
        impressions: 18_420,
        inquiries: 35,
        profileViews: 3_702,
        uniqueVisitors: 2_535,
      },
    },
    "90 days": {
      changes: {
        contacts: "+12.4%",
        impressions: "+9.8%",
        inquiries: "+13.8%",
        views: "+11.6%",
      },
      reviewActivity: "52 new reviews in the last 90 days",
      series: {
        contacts: [18, 23, 23, 23, 22, 15, 22, 17, 30, 20, 27, 20, 35],
        impressions: [3129, 3714, 3729, 3620, 3988, 4545, 6119, 3565, 3934, 3277, 3885, 3469, 6706],
        inquiries: [7, 5, 7, 7, 7, 9, 11, 4, 7, 7, 11, 9, 11],
        uniqueVisitors: [391, 505, 574, 468, 598, 430, 717, 400, 496, 442, 815, 539, 819],
        views: [583, 724, 995, 688, 594, 745, 854, 632, 978, 635, 971, 939, 1237],
      },
      totals: {
        contacts: 295,
        impressions: 53_680,
        inquiries: 102,
        profileViews: 10_575,
        uniqueVisitors: 7_194,
      },
    },
  },
})
