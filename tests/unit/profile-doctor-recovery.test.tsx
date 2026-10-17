// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ClinicProfile } from "@/features/clinic-dashboard/clinic-profile/ClinicProfile"
import {
  clinicProfileSourceFixture,
  createClinicProfileSourceCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile-source.fixtures"
import {
  clinicTreatmentSnapshotFixture,
  createClinicGalleryCommandsFixture,
  createClinicTreatmentCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/clinic-profile.fixtures"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/doctor-profile.fixtures"
import { useEditorDepartureGuard } from "@/features/clinic-dashboard/workspace/useEditorDepartureGuard"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("retains both actual profile and doctor drafts privately after the composed editor unmounts", async () => {
  const revokePreview = vi.fn()
  const NativeURL = URL
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = () => "blob:private-doctor-preview"
      static revokeObjectURL = revokePreview
    },
  )
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  const { result } = renderHook(() => useEditorDepartureGuard())
  const profileCommands = createClinicProfileSourceCommandsFixture()
  const doctorCommands = createDoctorProfileCommandsFixture()
  const saveProfile = vi.spyOn(profileCommands, "saveDraft")
  const saveDoctor = vi.spyOn(doctorCommands, "updateDoctor")
  const editor = render(
    <ClinicProfile
      galleryCommands={createClinicGalleryCommandsFixture()}
      galleryManagement="hidden"
      galleryStatus="ready"
      doctorCommands={doctorCommands}
      doctorDirectory={doctorDirectoryFixture}
      doctorManagement="interactive"
      onFocusHandled={() => {}}
      onNavigationRequestChange={result.current.setProfileRequest}
      sourceCommands={profileCommands}
      sourceProfileManagement="interactive"
      sourceSnapshot={clinicProfileSourceFixture}
      treatmentCommands={createClinicTreatmentCommandsFixture()}
      treatmentManagement="hidden"
      treatmentSnapshot={clinicTreatmentSnapshotFixture}
    />,
  )
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Clinic name" }), {
    target: { value: "Actual private profile work" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Edit Sarah Schmidt" }))
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Actual private doctor work" },
  })
  const imageFile = new File(["synthetic image"], "private-doctor.png", { type: "image/png" })
  fireEvent.change(screen.getByLabelText("Profile photo", { exact: true }), {
    target: { files: [imageFile] },
  })
  act(() => result.current.protectScope())
  editor.unmount()

  expect(result.current.protectedWork).toHaveLength(1)
  expect(result.current.protectedWork[0]?.draft).toEqual([
    expect.objectContaining({
      workingDraft: expect.objectContaining({ name: "Actual private profile work" }),
    }),
    expect.objectContaining({
      draft: expect.objectContaining({ firstName: "Actual private doctor work", imageFile }),
    }),
  ])
  expect(screen.queryByText("Actual private profile work")).toBeNull()
  expect(screen.queryByText("Actual private doctor work")).toBeNull()
  expect(saveProfile).not.toHaveBeenCalled()
  expect(saveDoctor).not.toHaveBeenCalled()
  await act(async () => result.current.discardProtectedWork())
  expect(result.current.protectedWork).toEqual([])
  expect(revokePreview).toHaveBeenCalledWith("blob:private-doctor-preview")
  expect(saveProfile).not.toHaveBeenCalled()
  expect(saveDoctor).not.toHaveBeenCalled()
})

it("retains actual profile and treatment drafts until original private cleanup completes", async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  const { result } = renderHook(() => useEditorDepartureGuard())
  const profileCommands = createClinicProfileSourceCommandsFixture()
  const treatmentCommands = createClinicTreatmentCommandsFixture()
  const saveProfile = vi.spyOn(profileCommands, "saveDraft")
  const saveTreatment = vi.spyOn(treatmentCommands, "updateTreatment")
  const editor = render(
    <ClinicProfile
      galleryCommands={createClinicGalleryCommandsFixture()}
      galleryManagement="hidden"
      galleryStatus="ready"
      doctorCommands={createDoctorProfileCommandsFixture()}
      doctorDirectory={doctorDirectoryFixture}
      doctorManagement="interactive"
      onFocusHandled={() => {}}
      onNavigationRequestChange={result.current.setProfileRequest}
      sourceCommands={profileCommands}
      sourceProfileManagement="interactive"
      sourceSnapshot={clinicProfileSourceFixture}
      treatmentCommands={treatmentCommands}
      treatmentManagement="interactive"
      treatmentSnapshot={clinicTreatmentSnapshotFixture}
    />,
  )
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Clinic name" }), {
    target: { value: "Actual private profile beside treatment" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Edit Laser teeth whitening" }))
  fireEvent.change(screen.getByRole("spinbutton", { name: "Price (EUR)" }), {
    target: { value: "777" },
  })
  act(() => result.current.protectScope())
  editor.unmount()

  expect(result.current.protectedWork).toHaveLength(1)
  expect(result.current.protectedWork[0]?.draft).toEqual([
    expect.objectContaining({
      workingDraft: expect.objectContaining({ name: "Actual private profile beside treatment" }),
    }),
    { treatmentId: clinicTreatmentSnapshotFixture.offerings[0]!.treatment.id, price: "777", active: true },
  ])
  expect(saveProfile).not.toHaveBeenCalled()
  expect(saveTreatment).not.toHaveBeenCalled()
  await act(async () => result.current.discardProtectedWork())
  expect(result.current.protectedWork).toEqual([])
  expect(saveProfile).not.toHaveBeenCalled()
  expect(saveTreatment).not.toHaveBeenCalled()
})
