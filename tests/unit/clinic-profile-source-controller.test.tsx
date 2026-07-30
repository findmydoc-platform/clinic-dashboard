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

  it("guards local edits and saves them independently as a persistent draft", async () => {
    const commands = createClinicProfileSourceCommandsFixture()
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
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
    const { result } = renderHook(() =>
      useClinicProfileSourceController({ commands, initialSnapshot: clinicProfileSourceFixture }),
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
