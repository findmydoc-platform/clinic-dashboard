// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DoctorDirectory } from "@/features/clinic-dashboard/clinic-profile/components/organisms/DoctorDirectory"
import { createDoctorProfileCommandsFixture } from "@/features/clinic-dashboard/clinic-profile/testing/doctor-profile.fixtures"
import { DoctorProfileDialog } from "@/features/clinic-dashboard/clinic-profile/components/organisms/DoctorProfileDialog"
import { doctorDirectoryFixture } from "@/features/clinic-dashboard/clinic-profile/testing/doctor-profile.fixtures"

describe("Doctor editor protected departure", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function () {
      this.open = false
    }
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })
  it("ignores an old clinic save result after the directory unmounts", async () => {
    const fixtureCommands = createDoctorProfileCommandsFixture()
    let release: (() => void) | undefined
    const commands: typeof fixtureCommands = {
      ...fixtureCommands,
      updateDoctor: async (...args) => {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return fixtureCommands.updateDoctor(...args)
      },
    }
    const changed = vi.fn()
    const view = render(
      <DoctorDirectory
        key="clinic-a"
        canManage
        commands={commands}
        snapshot={doctorDirectoryFixture}
        onDoctorsChange={changed}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Edit Sarah Schmidt" }))
    fireEvent.change(screen.getByLabelText("Biography"), { target: { value: "Private clinic A draft" } })
    fireEvent.click(screen.getByRole("button", { name: "Save doctor" }))
    expect(release).toBeTypeOf("function")
    const other = {
      ...doctorDirectoryFixture,
      doctors: [
        {
          ...doctorDirectoryFixture.doctors[0],
          id: "clinic-b-doctor",
          firstName: "Other",
          lastName: "Clinic",
        },
      ],
    }
    view.rerender(
      <DoctorDirectory
        key="clinic-b"
        canManage
        commands={createDoctorProfileCommandsFixture()}
        snapshot={other}
      />,
    )
    await act(async () => {
      release?.()
    })
    expect(screen.getByText("Other Clinic")).toBeTruthy()
    expect(screen.queryByText("Sarah Schmidt")).toBeNull()
    expect(changed).not.toHaveBeenCalled()
  })
  it("captures the actual private draft before an access-loss unmount without saving", () => {
    let request:
      | ((
          continuation: () => void,
          onCancel?: () => void,
          intent?: "context-change" | "destination" | "section" | "access-loss",
        ) => unknown)
      | null = null
    const save = vi.fn()
    render(
      <DoctorProfileDialog
        open
        initialDoctor={doctorDirectoryFixture.doctors[0]}
        medicalSpecialties={doctorDirectoryFixture.medicalSpecialties}
        onOpenChange={vi.fn()}
        onSave={save}
        onNavigationRequestChange={(value) => {
          request = value
        }}
      />,
    )
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Private unsaved draft" } })
    let protectedWork: unknown
    act(() => {
      protectedWork = request?.(() => undefined, undefined, "access-loss")
    })
    expect(protectedWork).toMatchObject({
      draft: { draft: { firstName: "Private unsaved draft" } },
      discard: expect.any(Function),
    })
    expect(save).not.toHaveBeenCalled()
  })
})
