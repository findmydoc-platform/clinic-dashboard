// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClinicProfileSourceController } from "@/features/clinic-dashboard/clinic-profile/hooks/useClinicProfileSourceController"
import { ClinicProfileSourceCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source-commands"
import {
  clinicProfileSourceDraftFixture,
  clinicProfileSourceFixture,
  createClinicProfileSourceCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"

describe("clinic profile source controller", () => {
  afterEach(cleanup)

  it("starts in conflict when a persisted draft targets an older published revision", () => {
    const conflictingSnapshot = {
      ...clinicProfileSourceDraftFixture,
      published: {
        ...clinicProfileSourceDraftFixture.published,
        revision: clinicProfileSourceDraftFixture.published.revision + 1,
      },
    }
    const commands = createClinicProfileSourceCommandsFixture(conflictingSnapshot)
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: conflictingSnapshot }),
    )

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.workingDraft?.name).toBe(conflictingSnapshot.draft?.name)
    expect(result.current.model.isDirty).toBe(false)
    expect(result.current.model.statusMessage).toContain("changed elsewhere")
  })

  it("keeps a reloaded snapshot in conflict while its draft still targets an older revision", async () => {
    const conflictingSnapshot = {
      ...clinicProfileSourceDraftFixture,
      published: {
        ...clinicProfileSourceDraftFixture.published,
        revision: clinicProfileSourceDraftFixture.published.revision + 1,
      },
    }
    const commands = {
      ...createClinicProfileSourceCommandsFixture(conflictingSnapshot),
      loadSnapshot: vi.fn(async () => conflictingSnapshot),
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: conflictingSnapshot }),
    )

    await act(async () => {
      await result.current.actions.reloadLatest()
    })

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.workingDraft?.name).toBe(conflictingSnapshot.draft?.name)
    expect(result.current.model.statusMessage).toContain("changed elsewhere")
  })

  it("guards local edits and saves them independently as a persistent draft", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const createDraft = vi.fn(persistedCommands.createDraft)
    const saveDraft = vi.fn(persistedCommands.saveDraft)
    const commands = { ...persistedCommands, createDraft, saveDraft }
    const onSnapshotChanged = vi.fn()
    const { result } = renderHook(() =>
      useClinicProfileSourceController({
        commands,
        initialSnapshot: clinicProfileSourceFixture,
        onSnapshotChanged,
      }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Medicana Istanbul International"))
    expect(result.current.model.isDirty).toBe(true)

    act(() => result.current.actions.requestCancel())
    expect(result.current.model.confirmation).toBe("leave")

    await act(async () => {
      await result.current.actions.saveDraft()
    })
    expect(result.current.model.isDirty).toBe(false)
    expect(result.current.model.hasSavedChanges).toBe(true)
    expect(result.current.model.snapshot?.draft?.name).toBe("Medicana Istanbul International")
    expect(createDraft).toHaveBeenCalledWith({ expectedPublishedRevision: 4 })
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ expectedDraftRevision: 1, expectedPublishedRevision: 4 }),
    )
    expect(onSnapshotChanged).toHaveBeenCalledWith(result.current.model.snapshot)
  })

  it("updates an existing draft without trying to create another one", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture)
    const createDraft = vi.fn(persistedCommands.createDraft)
    const saveDraft = vi.fn(persistedCommands.saveDraft)
    const commands = { ...persistedCommands, createDraft, saveDraft }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Updated saved draft"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(createDraft).not.toHaveBeenCalled()
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ expectedDraftRevision: 2, expectedPublishedRevision: 4 }),
    )
    expect(result.current.model.snapshot?.draft?.revision).toBe(3)
  })

  it("reloads a missing draft and recreates it safely on the next save", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const createDraft = vi.fn(persistedCommands.createDraft)
    const saveDraft = vi
      .fn<typeof persistedCommands.saveDraft>()
      .mockRejectedValueOnce(new ClinicProfileSourceCommandError("not-found", "Draft removed elsewhere."))
      .mockImplementation(persistedCommands.saveDraft)
    const commands = { ...persistedCommands, createDraft, saveDraft }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Locally preserved clinic name"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.mode).toBe("edit")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.workingDraft?.name).toBe("Locally preserved clinic name")
    expect(result.current.model.isDirty).toBe(true)
    expect(result.current.model.statusMessage).toContain("no longer exists")
    expect(createDraft).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(createDraft).toHaveBeenCalledWith({ expectedPublishedRevision: 4 })
    expect(saveDraft).toHaveBeenCalledTimes(2)
    expect(result.current.model.snapshot?.draft?.name).toBe("Locally preserved clinic name")
    expect(result.current.model.isDirty).toBe(false)
  })

  it("keeps a created baseline and retries only the update after a partial save failure", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const createDraft = vi.fn(persistedCommands.createDraft)
    const saveDraft = vi
      .fn<typeof persistedCommands.saveDraft>()
      .mockRejectedValueOnce(new ClinicProfileSourceCommandError("rejected", "Save rejected."))
      .mockImplementation(persistedCommands.saveDraft)
    const commands = { ...persistedCommands, createDraft, saveDraft }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Local clinic name"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.snapshot?.draft?.revision).toBe(1)
    expect(result.current.model.isDirty).toBe(true)
    expect(result.current.model.statusMessage).toContain("draft was created")

    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(createDraft).toHaveBeenCalledOnce()
    expect(saveDraft).toHaveBeenCalledTimes(2)
    expect(result.current.model.snapshot?.draft?.name).toBe("Local clinic name")
    expect(result.current.model.isDirty).toBe(false)
  })

  it("preserves local values and locks the editor on revision conflict", async () => {
    const commands = {
      ...createClinicProfileSourceCommandsFixture(),
      saveDraft: async () => {
        throw new ClinicProfileSourceCommandError("conflict", "Changed elsewhere.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Local clinic name"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.workingDraft?.name).toBe("Local clinic name")
  })

  it("leaves editing after an unknown save is reconciled as successful", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const commands = {
      ...persistedCommands,
      saveDraft: async (input: Parameters<typeof persistedCommands.saveDraft>[0]) => {
        await persistedCommands.saveDraft(input)
        throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
      },
    }
    const onSnapshotChanged = vi.fn()
    const { result } = renderHook(() =>
      useClinicProfileSourceController({
        commands,
        initialSnapshot: clinicProfileSourceFixture,
        onSnapshotChanged,
      }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Saved after timeout"))
    act(() => result.current.actions.requestCancel())
    await act(async () => {
      await result.current.actions.saveDraft(true)
    })

    expect(result.current.model.mode).toBe("view")
    expect(result.current.model.confirmation).toBeNull()
    expect(result.current.model.snapshot?.draft?.name).toBe("Saved after timeout")
    expect(onSnapshotChanged).toHaveBeenCalledWith(result.current.model.snapshot)
  })

  it("continues the first save after an unknown draft creation is reconciled", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const commands = {
      ...persistedCommands,
      createDraft: async (input: Parameters<typeof persistedCommands.createDraft>[0]) => {
        await persistedCommands.createDraft(input)
        throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Saved after create timeout"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.snapshot?.draft?.name).toBe("Saved after create timeout")
    expect(result.current.model.snapshot?.draft?.revision).toBe(2)
    expect(result.current.model.isDirty).toBe(false)
  })

  it("keeps local values retryable when an unknown creation did not persist", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const saveDraft = vi.fn(persistedCommands.saveDraft)
    const commands = {
      ...persistedCommands,
      createDraft: async () => {
        throw new ClinicProfileSourceCommandError("unknown", "Request failed before persistence.")
      },
      saveDraft,
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Still local"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.mode).toBe("edit")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.workingDraft?.name).toBe("Still local")
    expect(result.current.model.isDirty).toBe(true)
    expect(result.current.model.statusMessage).toContain("not created")
    expect(saveDraft).not.toHaveBeenCalled()
  })

  it("locks saving without losing local values when an unknown creation cannot be reconciled", async () => {
    const commands = {
      ...createClinicProfileSourceCommandsFixture(),
      createDraft: async () => {
        throw new ClinicProfileSourceCommandError("unknown", "Creation outcome unknown.")
      },
      loadSnapshot: async () => {
        throw new ClinicProfileSourceCommandError("unknown", "Snapshot unavailable.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Copyable local value"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.workingDraft?.name).toBe("Copyable local value")
    expect(result.current.model.statusMessage).toContain("could not be confirmed")
  })

  it("keeps an unchanged server baseline retryable when an unknown update did not persist", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    const commands = {
      ...persistedCommands,
      saveDraft: async () => {
        throw new ClinicProfileSourceCommandError("unknown", "Update outcome unknown.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.changeName("Still dirty"))
    await act(async () => {
      await result.current.actions.saveDraft()
    })

    expect(result.current.model.mode).toBe("edit")
    expect(result.current.model.snapshot?.draft?.revision).toBe(1)
    expect(result.current.model.workingDraft?.name).toBe("Still dirty")
    expect(result.current.model.isDirty).toBe(true)
    expect(result.current.model.statusMessage).toContain("not completed")
  })

  it("opens review directly from a changed saved draft in read mode", () => {
    const commands = createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture)
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.requestReview())

    expect(result.current.model.mode).toBe("review")
    expect(result.current.model.workingDraft?.descriptionText).toBe(
      clinicProfileSourceDraftFixture.draft?.descriptionText,
    )
  })

  it("moves an invalid saved draft into editing with field errors", () => {
    const invalidSnapshot = {
      ...clinicProfileSourceDraftFixture,
      draft: {
        ...clinicProfileSourceDraftFixture.draft!,
        address: { ...clinicProfileSourceDraftFixture.draft!.address, city: undefined },
      },
    }
    const commands = createClinicProfileSourceCommandsFixture(invalidSnapshot)
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: invalidSnapshot }),
    )

    act(() => result.current.actions.requestReview())

    expect(result.current.model.mode).toBe("edit")
    expect(result.current.model.validationErrors).toMatchObject({
      "address.cityId": "Select a city.",
    })
  })

  it("reconciles an unknown publish only when the published fields match the reviewed draft", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture)
    const commands = {
      ...persistedCommands,
      publishDraft: async (input: Parameters<typeof persistedCommands.publishDraft>[0]) => {
        await persistedCommands.publishDraft(input)
        throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.requestReview())
    await act(async () => {
      await result.current.actions.publishDraft()
    })

    expect(result.current.model.mode).toBe("view")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.snapshot?.published.descriptionText).toBe(
      clinicProfileSourceDraftFixture.draft?.descriptionText,
    )
  })

  it("reports the authoritative snapshot after the profile is published", async () => {
    const commands = createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture)
    const onSnapshotChanged = vi.fn()
    const { result } = renderHook(() =>
      useClinicProfileSourceController({
        commands,
        initialSnapshot: clinicProfileSourceDraftFixture,
        onSnapshotChanged,
      }),
    )

    act(() => result.current.actions.requestReview())
    await act(async () => {
      await result.current.actions.publishDraft()
    })

    expect(onSnapshotChanged).toHaveBeenCalledWith(result.current.model.snapshot)
    expect(result.current.model.snapshot?.draft).toBeUndefined()
  })

  it("enters conflict when an unknown publish reloads a different published profile", async () => {
    const foreignSnapshot = {
      ...clinicProfileSourceDraftFixture,
      draft: undefined,
      published: {
        ...clinicProfileSourceDraftFixture.published,
        name: "Published by another staff member",
        revision: 5,
      },
    }
    const commands = {
      ...createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture),
      loadSnapshot: async () => foreignSnapshot,
      publishDraft: async () => {
        throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.requestReview())
    await act(async () => {
      await result.current.actions.publishDraft()
    })

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.workingDraft?.descriptionText).toBe(
      clinicProfileSourceDraftFixture.draft?.descriptionText,
    )
  })

  it("reloads a missing publish draft and preserves the reviewed values in conflict", async () => {
    const commands = {
      ...createClinicProfileSourceCommandsFixture(),
      publishDraft: async () => {
        throw new ClinicProfileSourceCommandError("not-found", "Draft removed elsewhere.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.requestReview())
    await act(async () => {
      await result.current.actions.publishDraft()
    })

    expect(result.current.model.mode).toBe("conflict")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.workingDraft?.descriptionText).toBe(
      clinicProfileSourceDraftFixture.draft?.descriptionText,
    )
  })

  it("blocks repeat publishing until an unresolved outcome is reloaded", async () => {
    const loadSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(clinicProfileSourceDraftFixture)
    const publishDraft = vi.fn(async () => {
      throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
    })
    const commands = {
      ...createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture),
      loadSnapshot,
      publishDraft,
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    act(() => result.current.actions.requestReview())
    await act(async () => {
      await result.current.actions.publishDraft()
    })
    expect(result.current.model.publishOutcomeUnresolved).toBe(true)

    await act(async () => {
      await result.current.actions.publishDraft()
    })
    expect(publishDraft).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.actions.resolvePublishOutcome()
    })
    expect(result.current.model.publishOutcomeUnresolved).toBe(false)
    expect(result.current.model.statusMessage).toBe(
      "Publishing was not completed. Review the draft and try again.",
    )
  })

  it("reconciles an unknown discard without falsely claiming the draft remains", async () => {
    const persistedCommands = createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture)
    const commands = {
      ...persistedCommands,
      discardDraft: async (input: Parameters<typeof persistedCommands.discardDraft>[0]) => {
        await persistedCommands.discardDraft(input)
        throw new ClinicProfileSourceCommandError("unknown", "Response lost.")
      },
    }
    const onSnapshotChanged = vi.fn()
    const { result } = renderHook(() =>
      useClinicProfileSourceController({
        commands,
        initialSnapshot: clinicProfileSourceDraftFixture,
        onSnapshotChanged,
      }),
    )

    act(() => result.current.actions.startEditing())
    await act(async () => {
      await result.current.actions.discardDraft()
    })

    expect(result.current.model.mode).toBe("view")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.statusMessage).toBe("Draft discarded.")
    expect(onSnapshotChanged).toHaveBeenCalledWith(result.current.model.snapshot)
  })

  it("adopts a refreshed authoritative snapshot after an initial source error", () => {
    const commands = createClinicProfileSourceCommandsFixture(clinicProfileSourceFixture)
    const hook = renderHook(
      ({ initialSnapshot }) => useClinicProfileSourceController({ commands, initialSnapshot }),
      { initialProps: { initialSnapshot: undefined as typeof clinicProfileSourceFixture | undefined } },
    )

    expect(hook.result.current.model.isUnavailable).toBe(true)

    act(() => hook.rerender({ initialSnapshot: clinicProfileSourceFixture }))
    act(() => hook.result.current.actions.startEditing())

    expect(hook.result.current.model.isUnavailable).toBe(false)
    expect(hook.result.current.model.mode).toBe("edit")
    expect(hook.result.current.model.workingDraft?.name).toBe(clinicProfileSourceFixture.published.name)
  })

  it("does not replace unsaved profile values when an authoritative refresh arrives", () => {
    const commands = createClinicProfileSourceCommandsFixture(clinicProfileSourceFixture)
    const refreshedSnapshot = {
      ...clinicProfileSourceFixture,
      published: {
        ...clinicProfileSourceFixture.published,
        name: "Externally updated clinic",
        revision: clinicProfileSourceFixture.published.revision + 1,
      },
    }
    const hook = renderHook(
      ({ initialSnapshot }) => useClinicProfileSourceController({ commands, initialSnapshot }),
      { initialProps: { initialSnapshot: clinicProfileSourceFixture } },
    )

    act(() => hook.result.current.actions.startEditing())
    act(() => hook.result.current.actions.changeName("Unsaved local clinic"))
    act(() => hook.rerender({ initialSnapshot: refreshedSnapshot }))

    expect(hook.result.current.model.snapshot?.published.name).toBe(clinicProfileSourceFixture.published.name)
    expect(hook.result.current.model.workingDraft?.name).toBe("Unsaved local clinic")
    expect(hook.result.current.model.isDirty).toBe(true)

    act(() => hook.result.current.actions.leaveWithoutSaving())

    expect(hook.result.current.model.snapshot).toBe(refreshedSnapshot)
    expect(hook.result.current.model.published?.name).toBe("Externally updated clinic")
  })

  it("reconciles a draft that was already discarded elsewhere", async () => {
    const commands = {
      ...createClinicProfileSourceCommandsFixture(),
      discardDraft: async () => {
        throw new ClinicProfileSourceCommandError("not-found", "Draft removed elsewhere.")
      },
    }
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceDraftFixture }),
    )

    act(() => result.current.actions.startEditing())
    await act(async () => {
      await result.current.actions.discardDraft()
    })

    expect(result.current.model.mode).toBe("view")
    expect(result.current.model.snapshot?.draft).toBeUndefined()
    expect(result.current.model.statusMessage).toBe("Draft discarded.")
  })
})
