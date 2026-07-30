// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClinicTreatmentsController } from "@/features/clinic-dashboard/clinic-profile/hooks/useClinicTreatmentsController"
import { ClinicTreatmentCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatment-commands"
import { clinicTreatmentSnapshotFixture } from "@/features/clinic-dashboard/clinic-profile/testing/public"

afterEach(cleanup)

describe("clinic treatments controller", () => {
  it("reloads the source-backed list after a duplicate conflict", async () => {
    const refreshedSnapshot = {
      ...clinicTreatmentSnapshotFixture,
      offerings: [
        ...clinicTreatmentSnapshotFixture.offerings,
        {
          active: false,
          id: "offering-master-hair-transplant",
          price: 2400,
          treatment: clinicTreatmentSnapshotFixture.catalogue[3],
        },
      ],
    } as const
    const commands = {
      createTreatment: vi.fn(async () => {
        throw new ClinicTreatmentCommandError("conflict", "Duplicate treatment")
      }),
      loadTreatments: vi.fn(async () => refreshedSnapshot),
      updateTreatment: vi.fn(),
    }
    const hook = renderHook(() =>
      useClinicTreatmentsController({
        commands,
        initialSnapshot: clinicTreatmentSnapshotFixture,
        management: "interactive",
      }),
    )

    act(() => hook.result.current.actions.openCreate())
    let saved: boolean | undefined
    await act(async () => {
      saved = await hook.result.current.actions.save({
        active: false,
        price: 2400,
        treatmentId: "master-hair-transplant",
      })
    })

    expect(saved).toBe(false)
    expect(commands.loadTreatments).toHaveBeenCalledOnce()
    expect(hook.result.current.model.snapshot).toEqual(refreshedSnapshot)
    expect(hook.result.current.model.statusMessage).toBe(
      "This treatment was already changed. The list was reloaded.",
    )
  })

  it("does not open creation for read-only treatment access", () => {
    const hook = renderHook(() =>
      useClinicTreatmentsController({
        commands: {
          createTreatment: vi.fn(),
          loadTreatments: vi.fn(),
          updateTreatment: vi.fn(),
        },
        initialSnapshot: clinicTreatmentSnapshotFixture,
        management: "read-only",
      }),
    )

    act(() => hook.result.current.actions.openCreate())

    expect(hook.result.current.model.dialogOpen).toBe(false)
  })
})
