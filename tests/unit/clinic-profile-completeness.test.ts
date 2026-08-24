import { describe, expect, it } from "vitest"
import {
  evaluateClinicProfileDraftCompleteness,
  evaluateClinicProfileCompleteness,
  type ClinicProfileSnapshot,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  clinicProfileSourceDraftFixture,
  clinicProfileSourceFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"

describe("clinic profile completeness", () => {
  it("marks every configured published profile area complete", () => {
    expect(evaluateClinicProfileCompleteness(clinicProfileSourceFixture)).toEqual({
      areas: [
        { complete: true, id: "basic-information", missingFields: [] },
        { complete: true, id: "address", missingFields: [] },
        { complete: true, id: "languages", missingFields: [] },
        { complete: true, id: "opening-hours", missingFields: [] },
      ],
      completedAreaCount: 4,
      status: "ready",
    })
  })

  it("reports exact editable fields for every incomplete published area", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        address: {
          ...clinicProfileSourceFixture.published.address,
          city: undefined,
          houseNumber: "",
          street: " ",
          zipCode: "",
        },
        descriptionText: "",
        name: " ",
        openingHours: undefined,
        supportedLanguages: [],
      },
    }

    expect(evaluateClinicProfileCompleteness(snapshot)).toEqual({
      areas: [
        {
          complete: false,
          id: "basic-information",
          missingFields: ["name", "descriptionText"],
        },
        {
          complete: false,
          id: "address",
          missingFields: ["address.street", "address.houseNumber", "address.cityId", "address.zipCode"],
        },
        { complete: false, id: "languages", missingFields: ["supportedLanguages"] },
        {
          complete: false,
          id: "opening-hours",
          missingFields: [
            "openingHours.monday",
            "openingHours.tuesday",
            "openingHours.wednesday",
            "openingHours.thursday",
            "openingHours.friday",
            "openingHours.saturday",
            "openingHours.sunday",
          ],
        },
      ],
      completedAreaCount: 0,
      status: "ready",
    })
  })

  it("marks only the malformed opening-hours day as missing", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        openingHours: {
          ...clinicProfileSourceFixture.published.openingHours,
          monday: { closesAt: "08:00", isClosed: false, opensAt: "09:00" },
        },
      },
    }

    expect(evaluateClinicProfileCompleteness(snapshot)).toEqual({
      areas: [
        { complete: true, id: "basic-information", missingFields: [] },
        { complete: true, id: "address", missingFields: [] },
        { complete: true, id: "languages", missingFields: [] },
        {
          complete: false,
          id: "opening-hours",
          missingFields: ["openingHours.monday"],
        },
      ],
      completedAreaCount: 3,
      status: "ready",
    })
  })

  it("rejects a closed day that still carries an opening interval", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        openingHours: {
          ...clinicProfileSourceFixture.published.openingHours,
          sunday: { closesAt: "18:00", isClosed: true, opensAt: "09:00" },
        },
      },
    }

    const result = evaluateClinicProfileCompleteness(snapshot)

    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(result.areas.at(-1)).toEqual({
      complete: false,
      id: "opening-hours",
      missingFields: ["openingHours.sunday"],
    })
  })

  it("accepts a complete seven-day schedule when every day is explicitly closed", () => {
    const closedDay = { closesAt: "", isClosed: true, opensAt: "" } as const
    const snapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        openingHours: {
          friday: closedDay,
          monday: closedDay,
          saturday: closedDay,
          sunday: closedDay,
          thursday: closedDay,
          tuesday: closedDay,
          wednesday: closedDay,
        },
      },
    }

    const result = evaluateClinicProfileCompleteness(snapshot)

    expect(result.status).toBe("ready")
    if (result.status !== "ready") return
    expect(result.areas.at(-1)).toEqual({
      complete: true,
      id: "opening-hours",
      missingFields: [],
    })
  })

  it("returns a system-contract error when the fixed Türkiye context is broken", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        address: {
          ...clinicProfileSourceFixture.published.address,
          country: { code: "DE", name: "Germany" },
        },
      },
    } as unknown as ClinicProfileSnapshot

    expect(evaluateClinicProfileCompleteness(snapshot)).toEqual({
      reason: "invalid-country-context",
      status: "system-contract-error",
    })
  })

  it("reports no draft work when the profile has no draft", () => {
    expect(evaluateClinicProfileDraftCompleteness(clinicProfileSourceFixture)).toEqual({
      changedAreas: [],
      completedAreaCount: 4,
      missingAreas: [],
      state: "none",
    })
  })

  it("reports every real area change for a publish-ready draft", () => {
    expect(evaluateClinicProfileDraftCompleteness(clinicProfileSourceDraftFixture)).toEqual({
      changedAreas: ["basic-information", "address", "languages", "opening-hours"],
      completedAreaCount: 4,
      missingAreas: [],
      state: "publish-ready",
    })
  })

  it("reports a base-revision mismatch as a conflict even for a no-op draft", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      draft: {
        ...clinicProfileSourceFixture.published,
        basePublishedRevision: clinicProfileSourceFixture.published.revision - 1,
        revision: 1,
      },
    }

    expect(evaluateClinicProfileDraftCompleteness(snapshot)).toEqual({
      changedAreas: [],
      completedAreaCount: 4,
      missingAreas: [],
      state: "conflict",
    })
  })

  it("counts completed draft areas and keeps missing areas in edit order", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      draft: {
        ...clinicProfileSourceFixture.published,
        basePublishedRevision: clinicProfileSourceFixture.published.revision,
        descriptionText: "",
        openingHours: undefined,
        revision: 1,
      },
    }

    expect(evaluateClinicProfileDraftCompleteness(snapshot)).toEqual({
      changedAreas: ["basic-information", "opening-hours"],
      completedAreaCount: 2,
      missingAreas: ["basic-information", "opening-hours"],
      state: "incomplete",
    })
  })

  it("treats a persisted draft without semantic changes as no draft work", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      draft: {
        ...clinicProfileSourceFixture.published,
        basePublishedRevision: clinicProfileSourceFixture.published.revision,
        revision: 1,
        supportedLanguages: [...clinicProfileSourceFixture.published.supportedLanguages].reverse(),
      },
    }

    expect(evaluateClinicProfileDraftCompleteness(snapshot)).toEqual({
      changedAreas: [],
      completedAreaCount: 4,
      missingAreas: [],
      state: "none",
    })
  })

  it("fails the atomic result when a draft breaks the fixed country context", () => {
    const snapshot = {
      ...clinicProfileSourceFixture,
      draft: {
        ...clinicProfileSourceFixture.published,
        address: {
          ...clinicProfileSourceFixture.published.address,
          country: { code: "DE", name: "Germany" },
        },
        basePublishedRevision: clinicProfileSourceFixture.published.revision,
        revision: 1,
      },
    } as unknown as ClinicProfileSnapshot

    expect(evaluateClinicProfileCompleteness(snapshot)).toEqual({
      reason: "invalid-country-context",
      status: "system-contract-error",
    })
  })
})
