import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadClinicDashboardWorkspaceInput } from "@/features/clinic-dashboard/server"
import {
  dashboardReportingPeriods,
  dashboardSelectableMetricIds,
} from "@/features/clinic-dashboard/dashboard/model/reporting"

const expectedLocationReporting = {
  "antalya-lara": {
    "7 days": [1_260, 292, 207, 10, 3],
    "30 days": [4_960, 1_141, 804, 42, 13],
    "90 days": [12_840, 2_928, 2_051, 105, 35],
  },
  "istanbul-levent": {
    "7 days": [4_680, 945, 652, 27, 9],
    "30 days": [18_420, 3_702, 2_535, 104, 35],
    "90 days": [53_680, 10_575, 7_194, 295, 102],
  },
  "izmir-alsancak": {
    "7 days": [3_140, 691, 470, 22, 8],
    "30 days": [12_760, 2_780, 1_904, 91, 33],
    "90 days": [35_920, 7_755, 5_313, 250, 92],
  },
} as const

const expectedProfiles = {
  "antalya-lara": [4.9, 92],
  "istanbul-levent": [4.8, 1_248],
  "izmir-alsancak": [4.6, 486],
} as const

function containsFunction(value: unknown): boolean {
  if (typeof value === "function") return true
  if (!value || typeof value !== "object") return false
  return Object.values(value).some(containsFunction)
}

function readJpegDimensions(filePath: string) {
  const buffer = readFileSync(filePath)
  let offset = 2

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = buffer[offset + 1]
    const segmentLength = buffer.readUInt16BE(offset + 2)
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += segmentLength + 2
  }

  throw new Error(`JPEG dimensions not found for ${filePath}`)
}

describe("clinic dashboard demo workspace input", () => {
  it("loads a complete serializable workspace with a valid default snapshot", async () => {
    const input = await loadClinicDashboardWorkspaceInput()
    const locationIds = input.locations.map(({ id }) => id)

    expect(input).not.toHaveProperty("dataSource")
    expect(input.defaultLocationId).toBe("istanbul-levent")
    expect(locationIds).toEqual(["istanbul-levent", "izmir-alsancak", "antalya-lara"])
    expect(Object.keys(input.locationSnapshots).sort()).toEqual([...locationIds].sort())
    expect(input.locationSnapshots[input.defaultLocationId]).toBeDefined()
    expect(containsFunction(input)).toBe(false)
    expect(() => JSON.parse(JSON.stringify(input))).not.toThrow()
  })

  it("keeps organization notifications attached to valid location metadata", async () => {
    const input = await loadClinicDashboardWorkspaceInput()
    const locationsById = new Map(input.locations.map((location) => [location.id, location]))

    expect(new Set(input.notifications.map(({ locationId }) => locationId))).toEqual(
      new Set(["istanbul-levent", "izmir-alsancak", "antalya-lara"]),
    )
    for (const notification of input.notifications) {
      const location = locationsById.get(notification.locationId)
      expect(location).toBeDefined()
      expect(notification.locationLabel).toBe(location?.selectorLabel)
      expect(Date.parse(notification.createdAt)).toBeLessThanOrEqual(Date.parse("2026-07-19T10:00:00.000Z"))
      const snapshot = input.locationSnapshots[notification.locationId]
      if (notification.target.kind === "review") {
        expect(snapshot?.reviews.items.map(({ id }) => id)).toContain(notification.target.reviewId)
      }
    }
  })

  it("provides one cover and four real 1600 by 1200 images per location", async () => {
    const input = await loadClinicDashboardWorkspaceInput()
    const imageSources = new Set<string>()

    for (const location of input.locations) {
      const profile = input.locationSnapshots[location.id]?.clinicProfile
      expect(profile).toBeDefined()
      expect(profile?.galleryTotal).toBe(4)
      expect(profile?.gallery).toHaveLength(4)
      expect(profile?.gallery.filter(({ isCover }) => isCover)).toHaveLength(1)
      const cover = profile?.gallery.find(({ isCover }) => isCover)
      expect(cover).toBe(profile?.gallery[0])
      expect(cover?.id).toMatch(/-exterior$/u)
      expect(cover?.alt).toMatch(/^Exterior of /u)
      for (const image of profile?.gallery ?? []) {
        imageSources.add(typeof image.src === "string" ? image.src : image.src.src)
      }

      const assetsDirectory = path.join(
        process.cwd(),
        "src/features/clinic-dashboard/demo/assets/locations",
        location.id,
      )
      const imageFiles = readdirSync(assetsDirectory).filter((file) => file.endsWith(".jpg"))
      expect(imageFiles).toHaveLength(4)
      for (const imageFile of imageFiles) {
        expect(readJpegDimensions(path.join(assetsDirectory, imageFile))).toEqual({
          height: 1_200,
          width: 1_600,
        })
      }
    }

    expect(imageSources.size).toBe(12)
  })

  it("keeps profile, review, funnel, and reporting numbers consistent", async () => {
    const input = await loadClinicDashboardWorkspaceInput()
    const dateAxesByPeriod = new Map<string, string>()

    for (const location of input.locations) {
      const snapshot = input.locationSnapshots[location.id]
      const profileExpectation = expectedProfiles[location.id as keyof typeof expectedProfiles]
      const reportingExpectation =
        expectedLocationReporting[location.id as keyof typeof expectedLocationReporting]
      expect(snapshot).toBeDefined()
      if (!snapshot) continue

      expect([snapshot.dashboard.rating.value, snapshot.dashboard.rating.count]).toEqual(profileExpectation)
      expect(snapshot.dashboard).not.toHaveProperty("profileCompletion")
      expect(snapshot.dashboard).not.toHaveProperty("profileTasks")
      expect(snapshot.reviews.rating).toBe(snapshot.dashboard.rating.value)
      expect(snapshot.reviews.total).toBe(snapshot.dashboard.rating.count)
      expect(snapshot.reviews.distribution.reduce((total, entry) => total + entry.count, 0)).toBe(
        snapshot.reviews.total,
      )
      const weightedRating =
        snapshot.reviews.distribution.reduce((total, entry) => total + entry.count * entry.stars, 0) /
        snapshot.reviews.total
      expect(Number(weightedRating.toFixed(1))).toBe(snapshot.reviews.rating)

      for (const period of dashboardReportingPeriods) {
        const reporting = snapshot.dashboard.reporting[period]
        const [impressions, views, uniqueVisitors, contacts, inquiries] = reportingExpectation[period]
        expect(reporting.totals).toEqual({
          contacts,
          impressions,
          inquiries,
          profileViews: views,
          uniqueVisitors,
        })
        expect(impressions).toBeGreaterThan(views)
        expect(views).toBeGreaterThan(uniqueVisitors)
        expect(uniqueVisitors).toBeGreaterThan(contacts)
        expect(contacts).toBeGreaterThan(inquiries)

        const [profileViewsRate, uniqueVisitorRate, contactRate, inquiryRate] = [
          views / impressions,
          uniqueVisitors / views,
          contacts / uniqueVisitors,
          inquiries / contacts,
        ]
        expect(profileViewsRate).toBeGreaterThanOrEqual(0.19)
        expect(profileViewsRate).toBeLessThanOrEqual(0.24)
        expect(uniqueVisitorRate).toBeGreaterThanOrEqual(0.67)
        expect(uniqueVisitorRate).toBeLessThanOrEqual(0.72)
        expect(contactRate).toBeGreaterThanOrEqual(0.04)
        expect(contactRate).toBeLessThanOrEqual(0.055)
        expect(inquiryRate).toBeGreaterThanOrEqual(0.3)
        expect(inquiryRate).toBeLessThanOrEqual(0.37)

        for (const metric of reporting.metrics) {
          if (metric.delta) expect(metric.delta).toMatch(/^\+/u)
        }

        const expectedSeriesTotals = { contacts, impressions, inquiries, uniqueVisitors, views }
        for (const metricId of dashboardSelectableMetricIds) {
          expect(reporting.chart.series[metricId].reduce((total, point) => total + point.value, 0)).toBe(
            expectedSeriesTotals[metricId],
          )
        }

        const dateAxis = JSON.stringify(
          reporting.chart.series.impressions.map(({ axisLabel, dateLabel }) => ({ axisLabel, dateLabel })),
        )
        expect(dateAxesByPeriod.get(period) ?? dateAxis).toBe(dateAxis)
        dateAxesByPeriod.set(period, dateAxis)
      }
    }
  })

  it("keeps every location-specific demo flow available and synthetic", async () => {
    const input = await loadClinicDashboardWorkspaceInput()

    for (const location of input.locations) {
      const snapshot = input.locationSnapshots[location.id]
      expect(snapshot.messages.conversations).toHaveLength(3)
      expect(snapshot.messages.messages).toHaveLength(3)
      expect(new Set(snapshot.messages.conversations.map(({ id }) => id)).size).toBe(
        snapshot.messages.conversations.length,
      )
      expect(new Set(snapshot.messages.messages.map(({ id }) => id)).size).toBe(
        snapshot.messages.messages.length,
      )
      const activeConversations = snapshot.messages.conversations.filter(
        ({ id }) => id === snapshot.messages.activeConversationId,
      )
      expect(activeConversations).toHaveLength(1)
      const activeConversation = activeConversations[0]
      expect(activeConversation?.name).toBe(snapshot.patientInquiry.name)
      expect(activeConversation?.treatment?.name).toBe(snapshot.patientInquiry.interest)
      expect(snapshot.patientInquiry.email).toMatch(/@example\.com$/u)
      expect(snapshot.patientInquiry.phone).toMatch(/000/u)
      expect(snapshot.patientInquiry).not.toHaveProperty("age")
      expect(snapshot.patientInquiry).not.toHaveProperty("gender")
      expect(snapshot.patientInquiry).not.toHaveProperty("lastVisit")
      expect(snapshot.patientInquiry).not.toHaveProperty("medicalNotes")
      expect(snapshot.patientInquiry).not.toHaveProperty("revision")
      expect(snapshot.patientInquiry).not.toHaveProperty("status")
      expect(snapshot.clinicProfile.address.phone).toMatch(/000/u)
      const doctorsById = new Map(snapshot.clinicProfile.team.map((doctor) => [doctor.id, doctor]))
      for (const conversation of snapshot.messages.conversations) {
        expect(doctorsById.get(conversation.doctor.id)).toMatchObject({
          initials: conversation.doctor.initials,
          name: conversation.doctor.name,
          specialty: conversation.doctor.specialty,
        })
      }
      expect(new Set(snapshot.messages.messages.map(({ sender }) => sender))).toEqual(
        new Set(["doctor", "patient"]),
      )
      expect(snapshot.reviews.items).toHaveLength(6)
      expect(snapshot.reviews.items.some(({ status }) => status === "Open")).toBe(true)
      expect(snapshot.reviews.items.some(({ status }) => status === "Answered")).toBe(true)
      const pendingResponses = snapshot.reviews.items.flatMap(({ pendingResponse }) =>
        pendingResponse ? [pendingResponse] : [],
      )
      expect(pendingResponses).toHaveLength(1)
      expect(pendingResponses[0]).toMatchObject({ status: "pending-moderation" })
      expect(snapshot.dashboard.rating.pendingResponses).toBe(pendingResponses.length)

      const appealCases = snapshot.reviews.items.flatMap(({ appealCase }) => (appealCase ? [appealCase] : []))
      expect(appealCases).toHaveLength(1)
      const appealCase = appealCases[0]
      expect(appealCase?.events[0]).toMatchObject({
        status: "submitted",
        type: "appeal-submitted",
      })
      if (appealCase?.status === "submitted") {
        expect(appealCase.events).toHaveLength(1)
      } else {
        expect(appealCase?.status).toBe("under-review")
        expect(appealCase?.events).toHaveLength(2)
        expect(appealCase?.events[1]).toMatchObject({
          fromStatus: "submitted",
          toStatus: "under-review",
          type: "appeal-status-changed",
        })
      }
      expect(snapshot.reviews.referenceTime).toBe("2026-07-19T10:00:00.000Z")
    }
  })
})
