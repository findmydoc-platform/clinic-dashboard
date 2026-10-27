import { describe, expect, it } from "vitest"
import type { ClinicProfileSnapshot } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source"
import { clinicProfileSourceSnapshotSchema } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source-schema"
import { clinicProfileResponseCases } from "../support/clinic-profile-response-cases"

function expectParsedSnapshot(actual: ClinicProfileSnapshot, expected: ClinicProfileSnapshot) {
  expect(actual).toStrictEqual(expected)
  expect(Object.hasOwn(actual, "draft")).toBe(Object.hasOwn(expected, "draft"))
  expect(Object.hasOwn(actual.published, "openingHours")).toBe(
    Object.hasOwn(expected.published, "openingHours"),
  )
  expect(Object.hasOwn(actual.published.address, "city")).toBe(
    Object.hasOwn(expected.published.address, "city"),
  )
  if (actual.draft && expected.draft) {
    expect(Object.hasOwn(actual.draft, "openingHours")).toBe(Object.hasOwn(expected.draft, "openingHours"))
    expect(Object.hasOwn(actual.draft.address, "city")).toBe(Object.hasOwn(expected.draft.address, "city"))
  }
}

function minimalResponse() {
  return {
    availableCities: [],
    published: {
      address: { country: { code: "TR", name: "Türkiye" }, houseNumber: "", street: "", zipCode: "" },
      descriptionText: "",
      name: "",
      revision: 0,
      supportedLanguages: [],
    },
  }
}

function minimalExpected(): ClinicProfileSnapshot {
  return {
    availableCities: [],
    published: {
      address: { country: { code: "TR", name: "Türkiye" }, houseNumber: "", street: "", zipCode: "" },
      descriptionText: "",
      name: "",
      revision: 0,
      supportedLanguages: [],
    },
  }
}

describe("Clinic profile snapshot response contract", () => {
  it.each(clinicProfileResponseCases)("$name", ({ body, expected }) => {
    const parsed = clinicProfileSourceSnapshotSchema.safeParse(body)
    if (expected) {
      expect(parsed.success).toBe(true)
      if (!parsed.success) throw new Error("Expected a parsed clinic profile snapshot")
      expectParsedSnapshot(parsed.data, expected)
    } else {
      expect(parsed.success).toBe(false)
    }
  })

  it.each([false, true])("preserves draft presence when explicitly undefined is %s", (present) => {
    const body = { ...minimalResponse(), ...(present ? { draft: undefined } : {}) }
    const expected = { ...minimalExpected(), ...(present ? { draft: undefined } : {}) }
    const parsed = clinicProfileSourceSnapshotSchema.safeParse(body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) throw new Error("Expected a parsed clinic profile snapshot")
    expectParsedSnapshot(parsed.data, expected)
    expect(Object.hasOwn(parsed.data, "draft")).toBe(present)
  })

  describe.each(["published", "draft"] as const)("%s optional fields", (profileKey) => {
    it.each([false, true])("preserves city presence when explicitly undefined is %s", (present) => {
      const profile = {
        ...minimalResponse().published,
        ...(profileKey === "draft" ? { basePublishedRevision: 0 } : {}),
        address: { ...minimalResponse().published.address, ...(present ? { city: undefined } : {}) },
      }
      const expectedProfile = {
        ...minimalExpected().published,
        ...(profileKey === "draft" ? { basePublishedRevision: 0 } : {}),
        address: { ...minimalExpected().published.address, ...(present ? { city: undefined } : {}) },
      }
      const parsed = clinicProfileSourceSnapshotSchema.safeParse({
        ...minimalResponse(),
        [profileKey]: profile,
      })
      expect(parsed.success).toBe(true)
      if (!parsed.success) throw new Error("Expected a parsed clinic profile snapshot")
      expect(parsed.data).toStrictEqual({ ...minimalExpected(), [profileKey]: expectedProfile })
      expect(Object.hasOwn(parsed.data[profileKey]!.address, "city")).toBe(present)
    })

    it.each([false, true])("preserves hours presence when explicitly undefined is %s", (present) => {
      const profile = {
        ...minimalResponse().published,
        ...(profileKey === "draft" ? { basePublishedRevision: 0 } : {}),
        ...(present ? { openingHours: undefined } : {}),
      }
      const expectedProfile = {
        ...minimalExpected().published,
        ...(profileKey === "draft" ? { basePublishedRevision: 0 } : {}),
        ...(present ? { openingHours: undefined } : {}),
      }
      const parsed = clinicProfileSourceSnapshotSchema.safeParse({
        ...minimalResponse(),
        [profileKey]: profile,
      })
      expect(parsed.success).toBe(true)
      if (!parsed.success) throw new Error("Expected a parsed clinic profile snapshot")
      expect(parsed.data).toStrictEqual({ ...minimalExpected(), [profileKey]: expectedProfile })
      expect(Object.hasOwn(parsed.data[profileKey]!, "openingHours")).toBe(present)
    })

    it.each(["city", "openingHours"])("rejects null optional %s", (field) => {
      const profile = {
        ...minimalResponse().published,
        ...(profileKey === "draft" ? { basePublishedRevision: 0 } : {}),
        ...(field === "city"
          ? { address: { ...minimalResponse().published.address, city: null } }
          : { openingHours: null }),
      }
      expect(
        clinicProfileSourceSnapshotSchema.safeParse({ ...minimalResponse(), [profileKey]: profile }).success,
      ).toBe(false)
    })
  })

  it("rejects null optional draft", () => {
    expect(clinicProfileSourceSnapshotSchema.safeParse({ ...minimalResponse(), draft: null }).success).toBe(
      false,
    )
  })

  it("does not retain city membership from an earlier catalog", () => {
    for (const id of ["catalog-a-only", "catalog-b-only"]) {
      const body = {
        ...minimalResponse(),
        availableCities: [{ id, name: "Catalog city" }],
        published: {
          ...minimalResponse().published,
          address: { ...minimalResponse().published.address, city: { id, name: "Profile alias" } },
        },
      }
      expect(clinicProfileSourceSnapshotSchema.safeParse(body).success).toBe(true)
    }
    const foreignCitySnapshot = {
      ...minimalResponse(),
      availableCities: [{ id: "catalog-b-only", name: "Catalog B" }],
      published: {
        ...minimalResponse().published,
        address: {
          ...minimalResponse().published.address,
          city: { id: "catalog-a-only", name: "Earlier city" },
        },
      },
    }
    expect(clinicProfileSourceSnapshotSchema.safeParse(foreignCitySnapshot).success).toBe(false)
  })
})
