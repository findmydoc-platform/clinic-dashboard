import { describe, expect, it } from "vitest"
import {
  createProfileViewsCsvExport,
  createProfileViewsCsvFilename,
  serializeProfileViewsCsv,
} from "@/features/clinic-dashboard/dashboard/public"

describe("profile views CSV export", () => {
  it("serializes the existing quoted CSV contract", () => {
    expect(
      serializeProfileViewsCsv([
        { dateLabel: "October 6", value: 103 },
        { dateLabel: 'October "special"', value: 111 },
      ]),
    ).toBe('"date","profileViews"\n"October 6","103"\n"October ""special""","111"')
  })

  it("creates a stable period-specific filename", () => {
    expect(createProfileViewsCsvFilename("30 days")).toBe("profile-views-30-days.csv")
  })

  it("creates the complete browser-download contract from one selected report", () => {
    expect(createProfileViewsCsvExport([{ dateLabel: "October 6", value: 103 }], "7 days")).toEqual({
      content: '"date","profileViews"\n"October 6","103"',
      fileName: "profile-views-7-days.csv",
      mimeType: "text/csv",
    })
  })
})
