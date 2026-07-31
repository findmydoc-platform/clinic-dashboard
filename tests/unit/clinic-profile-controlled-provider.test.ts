import { beforeEach, describe, expect, it } from "vitest"
import { createClinicProfileDraftInput } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source"
import {
  createControlledClinicProfileProvider,
  resetControlledClinicProfileProvider,
} from "@/features/clinic-dashboard/clinic-profile/server/controlled-clinic-profile"

describe("Controlled clinic profile provider", () => {
  beforeEach(() => {
    resetControlledClinicProfileProvider()
  })

  it("persists a structurally valid incomplete draft without changing published data", async () => {
    const provider = createControlledClinicProfileProvider()
    const loaded = await provider.loadSnapshot()
    if (!loaded.ok) throw new Error("Expected controlled profile")
    const created = await provider.createDraft({
      expectedPublishedRevision: loaded.value.published.revision,
    })
    if (!created.ok || !created.value.draft) throw new Error("Expected controlled draft")

    const result = await provider.saveDraft({
      draft: {
        ...createClinicProfileDraftInput(loaded.value.published),
        address: {
          cityId: undefined,
          houseNumber: "",
          street: "",
          zipCode: "00123",
        },
        descriptionText: "",
        name: "",
        supportedLanguages: [],
      },
      expectedDraftRevision: created.value.draft.revision,
      expectedPublishedRevision: loaded.value.published.revision,
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        draft: {
          address: { city: undefined, country: { code: "TR", name: "Türkiye" }, zipCode: "00123" },
          basePublishedRevision: 1,
          name: "",
          revision: 2,
        },
        published: { name: "Controlled Bosphorus Clinic", revision: 1 },
      },
    })

    const resumed = await createControlledClinicProfileProvider().loadSnapshot()
    expect(resumed).toMatchObject({ ok: true, value: { draft: { revision: 2 } } })
  })

  it("rejects stale draft saves and publishes only a complete current draft", async () => {
    const provider = createControlledClinicProfileProvider()
    const loaded = await provider.loadSnapshot()
    if (!loaded.ok) throw new Error("Expected controlled profile")

    const draft = createClinicProfileDraftInput(loaded.value.published)
    const created = await provider.createDraft({ expectedPublishedRevision: 1 })
    if (!created.ok || !created.value.draft) throw new Error("Expected controlled draft")
    const firstSave = await provider.saveDraft({
      draft,
      expectedDraftRevision: created.value.draft.revision,
      expectedPublishedRevision: 1,
    })
    expect(firstSave).toMatchObject({ ok: true, value: { draft: { revision: 2 } } })

    await expect(
      provider.saveDraft({
        draft: { ...draft, name: "Stale overwrite" },
        expectedDraftRevision: 1,
        expectedPublishedRevision: 1,
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })

    await expect(
      provider.publishDraft({
        expectedDraftRevision: 2,
        expectedPublishedRevision: 1,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        draft: undefined,
        published: { name: "Controlled Bosphorus Clinic", revision: 2 },
      },
    })
  })

  it("keeps an incomplete draft after publish validation fails and supports conflict-safe discard", async () => {
    const provider = createControlledClinicProfileProvider()
    const loaded = await provider.loadSnapshot()
    if (!loaded.ok) throw new Error("Expected controlled profile")
    const created = await provider.createDraft({ expectedPublishedRevision: 1 })
    if (!created.ok || !created.value.draft) throw new Error("Expected controlled draft")

    const saved = await provider.saveDraft({
      draft: {
        ...createClinicProfileDraftInput(loaded.value.published),
        address: {
          cityId: undefined,
          houseNumber: "",
          street: "",
          zipCode: "",
        },
        name: "",
      },
      expectedDraftRevision: created.value.draft.revision,
      expectedPublishedRevision: 1,
    })
    expect(saved).toMatchObject({ ok: true, value: { draft: { revision: 2 } } })

    await expect(
      provider.publishDraft({
        expectedDraftRevision: 2,
        expectedPublishedRevision: 1,
      }),
    ).resolves.toEqual({ error: "invalid-input", ok: false })
    await expect(provider.discardDraft({ expectedDraftRevision: 3 })).resolves.toEqual({
      error: "conflict",
      ok: false,
    })
    await expect(provider.discardDraft({ expectedDraftRevision: 2 })).resolves.toMatchObject({
      ok: true,
      value: { draft: undefined, published: { revision: 1 } },
    })
  })
})
