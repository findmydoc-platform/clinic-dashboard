import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadClinicDashboardWorkspaceInput } from "@/features/clinic-dashboard/server"
import {
  dashboardReportingPeriods,
  dashboardSelectableMetricIds,
} from "@/features/clinic-dashboard/dashboard/model/reporting"

const expectedLocationReporting = {
  "berlin-charlottenburg": {
    "7 days": [3_140, 672, 438, 18, 7],
    "30 days": [12_760, 2_740, 1_780, 61, 24],
    "90 days": [35_920, 7_420, 4_860, 158, 62],
  },
  "berlin-mitte": {
    "7 days": [4_680, 848, 543, 12, 5],
    "30 days": [18_420, 3_284, 2_105, 42, 16],
    "90 days": [53_680, 9_410, 6_006, 118, 45],
  },
  potsdam: {
    "7 days": [1_260, 286, 201, 10, 4],
    "30 days": [4_960, 1_080, 758, 38, 15],
    "90 days": [12_840, 2_760, 1_940, 91, 36],
  },
} as const

const expectedProfiles = {
  "berlin-charlottenburg": [91, 4.6, 486],
  "berlin-mitte": [82, 4.8, 1_248],
  potsdam: [64, 4.9, 92],
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

    expect(input.dataSource).toBe("demo")
    expect(input.defaultLocationId).toBe("berlin-mitte")
    expect(locationIds).toEqual(["berlin-mitte", "berlin-charlottenburg", "potsdam"])
    expect(Object.keys(input.locationSnapshots).sort()).toEqual([...locationIds].sort())
    expect(input.locationSnapshots[input.defaultLocationId]).toBeDefined()
    expect(containsFunction(input)).toBe(false)
    expect(() => JSON.parse(JSON.stringify(input))).not.toThrow()
  })

  it("keeps organization notifications attached to valid location metadata", async () => {
    const input = await loadClinicDashboardWorkspaceInput()
    const locationsById = new Map(input.locations.map((location) => [location.id, location]))

    expect(new Set(input.notifications.map(({ locationId }) => locationId))).toEqual(
      new Set(["berlin-mitte", "berlin-charlottenburg", "potsdam"]),
    )
    for (const notification of input.notifications) {
      const location = locationsById.get(notification.locationId)
      expect(location).toBeDefined()
      expect(notification.locationLabel).toBe(location?.selectorLabel)
      expect(Date.parse(notification.createdAt)).toBeLessThanOrEqual(Date.parse("2026-07-19T10:00:00.000Z"))
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

      expect([
        snapshot.dashboard.profileCompletion,
        snapshot.dashboard.rating.value,
        snapshot.dashboard.rating.count,
      ]).toEqual(profileExpectation)
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
      expect(snapshot.clinicProfile.address.phone).toContain("0000")
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
