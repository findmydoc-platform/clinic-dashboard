// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useClinicProfileSourceController } from "@/features/clinic-dashboard/clinic-profile/hooks/useClinicProfileSourceController"
import { ClinicProfileSourceCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source-commands"
import {
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
})
