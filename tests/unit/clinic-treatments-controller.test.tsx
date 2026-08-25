// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClinicTreatmentsController } from "@/features/clinic-dashboard/clinic-profile/hooks/useClinicTreatmentsController"
import { ClinicTreatmentCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatment-commands"
import type { ClinicTreatmentsSnapshot } from "@/features/clinic-dashboard/clinic-profile/model/clinic-treatment"
import { clinicTreatmentSnapshotFixture } from "@/features/clinic-dashboard/clinic-profile/testing/public"

afterEach(cleanup)

describe("clinic treatments controller", () => {
  it("adopts a ready snapshot after an initial source error", () => {
    const commands = {
      createTreatment: vi.fn(),
      loadTreatments: vi.fn(),
      updateTreatment: vi.fn(),
    }
    const unavailable = { catalogue: [], offerings: [], status: "temporarily-unavailable" } as const
    const hook = renderHook(
      ({ initialSnapshot }) =>
        useClinicTreatmentsController({
          commands,
          initialSnapshot,
          management: "interactive",
        }),
      { initialProps: { initialSnapshot: unavailable as ClinicTreatmentsSnapshot } },
    )

    act(() => hook.rerender({ initialSnapshot: clinicTreatmentSnapshotFixture }))
    act(() => hook.result.current.actions.openCreate())

    expect(hook.result.current.model.snapshot).toBe(clinicTreatmentSnapshotFixture)
    expect(hook.result.current.model.dialogOpen).toBe(true)
    expect(hook.result.current.model.availableTreatments.length).toBeGreaterThan(0)
  })

  it("does not replace the selected treatment while its editor is open", () => {
    const offering = clinicTreatmentSnapshotFixture.offerings[0]!
    const refreshedSnapshot = {
      ...clinicTreatmentSnapshotFixture,
      offerings: clinicTreatmentSnapshotFixture.offerings.map((current) =>
        current.id === offering.id ? { ...current, price: current.price + 100 } : current,
      ),
    } satisfies ClinicTreatmentsSnapshot
    const commands = {
      createTreatment: vi.fn(),
      loadTreatments: vi.fn(),
      updateTreatment: vi.fn(),
    }
    const hook = renderHook(
      ({ initialSnapshot }) =>
        useClinicTreatmentsController({
          commands,
          initialSnapshot,
          management: "interactive",
        }),
      { initialProps: { initialSnapshot: clinicTreatmentSnapshotFixture as ClinicTreatmentsSnapshot } },
    )

    act(() => hook.result.current.actions.openOffering(offering))
    act(() => hook.rerender({ initialSnapshot: refreshedSnapshot }))

    expect(hook.result.current.model.snapshot).toBe(clinicTreatmentSnapshotFixture)
    expect(hook.result.current.model.selectedOffering?.price).toBe(offering.price)

    act(() => hook.result.current.actions.setDialogOpen(false))

    expect(hook.result.current.model.snapshot).toBe(refreshedSnapshot)
    expect(hook.result.current.model.snapshot.offerings[0]?.price).toBe(offering.price + 100)
  })

  it("reports the authoritative snapshot after a treatment is saved", async () => {
    const offering = clinicTreatmentSnapshotFixture.offerings[0]
    const updatedOffering = { ...offering, active: !offering.active }
    const onSaved = vi.fn()
    const commands = {
      createTreatment: vi.fn(),
      loadTreatments: vi.fn(),
      updateTreatment: vi.fn(async () => updatedOffering),
    }
    const hook = renderHook(() =>
      useClinicTreatmentsController({
        commands,
        initialSnapshot: clinicTreatmentSnapshotFixture,
        management: "interactive",
        onSaved,
      }),
    )

    act(() => hook.result.current.actions.openOffering(offering))
    await act(async () => {
      await hook.result.current.actions.save({
        active: updatedOffering.active,
        price: updatedOffering.price,
        treatmentId: updatedOffering.treatment.id,
      })
    })

    expect(onSaved).toHaveBeenCalledWith({
      ...clinicTreatmentSnapshotFixture,
      offerings: clinicTreatmentSnapshotFixture.offerings.map((current) =>
        current.id === updatedOffering.id ? updatedOffering : current,
      ),
    })
  })

  it("sends the selected offering revision with an update", async () => {
    const offering = clinicTreatmentSnapshotFixture.offerings[0]
    const commands = {
      createTreatment: vi.fn(),
      loadTreatments: vi.fn(),
      updateTreatment: vi.fn(async () => ({ ...offering, active: !offering.active })),
    }
    const hook = renderHook(() =>
      useClinicTreatmentsController({
        commands,
        initialSnapshot: clinicTreatmentSnapshotFixture,
        management: "interactive",
      }),
    )

    act(() => hook.result.current.actions.openOffering(offering))
    await act(async () => {
      await hook.result.current.actions.save({
        active: !offering.active,
        price: offering.price,
        treatmentId: offering.treatment.id,
      })
    })

    expect(commands.updateTreatment).toHaveBeenCalledWith(offering.id, {
      active: !offering.active,
      expectedRevision: offering.revision,
      price: offering.price,
    })
  })

  it("reloads the source-backed list after a duplicate conflict", async () => {
    const refreshedSnapshot = {
      ...clinicTreatmentSnapshotFixture,
      offerings: [
        ...clinicTreatmentSnapshotFixture.offerings,
        {
          active: false,
          id: "offering-master-hair-transplant",
          price: 2400,
          revision: "2026-08-13T10:00:00.000Z",
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
    expect(hook.result.current.model.dialogOpen).toBe(true)
    expect(hook.result.current.model.selectedOffering?.id).toBe("offering-master-hair-transplant")
    expect(hook.result.current.model.dialogMessage).toBe("Review your values and save again.")
    expect(hook.result.current.model.statusMessage).toBe(
      "This treatment changed elsewhere. The latest version was loaded.",
    )
  })

  it("does not claim a conflict reload succeeded when loading fails", async () => {
    const commands = {
      createTreatment: vi.fn(async () => {
        throw new ClinicTreatmentCommandError("conflict", "Duplicate treatment")
      }),
      loadTreatments: vi.fn(async () => {
        throw new Error("Network unavailable")
      }),
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
    await act(async () => {
      await hook.result.current.actions.save({
        active: false,
        price: 2400,
        treatmentId: "master-hair-transplant",
      })
    })

    expect(hook.result.current.model.dialogOpen).toBe(true)
    expect(hook.result.current.model.snapshot.status).toBe("temporarily-unavailable")
    expect(hook.result.current.model.dialogMessage).toContain("Your values were not saved")
    expect(hook.result.current.model.statusMessage).toBe(
      "This treatment was already changed, but the list could not be reloaded.",
    )
  })

  it("keeps save failures visible inside the open dialog", async () => {
    const commands = {
      createTreatment: vi.fn(async () => {
        throw new ClinicTreatmentCommandError("unknown", "Save failed")
      }),
      loadTreatments: vi.fn(),
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
    await act(async () => {
      await hook.result.current.actions.save({
        active: false,
        price: 2400,
        treatmentId: "master-hair-transplant",
      })
    })

    expect(hook.result.current.model.dialogOpen).toBe(true)
    expect(hook.result.current.model.dialogMessage).toBe("Treatment changes could not be saved. Try again.")
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
