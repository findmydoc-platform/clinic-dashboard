// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Avatar } from "@/components/ui/avatar"
import { DoctorDirectory } from "@/features/clinic-dashboard/clinic-profile/components/organisms/DoctorDirectory"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/doctor-profile.fixtures"

const privateImage = "/api/dashboard/clinics/clinic-1/doctors/doctor-sarah-schmidt/image"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("loads the authorized portrait directly in the directory and doctor editor", () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  const snapshot = {
    ...doctorDirectoryFixture,
    doctors: doctorDirectoryFixture.doctors.map((doctor) =>
      doctor.id === "doctor-sarah-schmidt"
        ? { ...doctor, image: { id: "private-image", alt: "Doctor portrait", url: privateImage } }
        : doctor,
    ),
  }
  const { container } = render(
    <DoctorDirectory canManage commands={createDoctorProfileCommandsFixture()} snapshot={snapshot} />,
  )

  expect(container.querySelector("img")).toHaveAttribute("src", privateImage)
  expect(container.querySelector("img")).not.toHaveAttribute("srcset")

  fireEvent.click(screen.getByRole("button", { name: /edit sarah schmidt/i }))
  const editor = screen.getByRole("dialog", { name: "Edit doctor" })
  expect(editor.querySelector("img")).toHaveAttribute("src", privateImage)
  expect(editor.querySelector("img")).not.toHaveAttribute("srcset")
})

it("keeps image optimization for ordinary shared avatar sources", () => {
  const { container } = render(<Avatar initials="DR" src="/portrait.jpg" />)

  expect(container.querySelector("img")?.getAttribute("src")).toMatch(/^\/_next\/image\?/u)
  expect(container.querySelector("img")).toHaveAttribute("srcset")
})

it("remounts the directory portrait when its media identity changes", async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL() {
        return "blob:replacement-portrait"
      }
      static revokeObjectURL() {}
    },
  )
  const doctor = {
    ...doctorDirectoryFixture.doctors[0],
    image: { id: "original-image", alt: "Doctor portrait", url: privateImage },
  }
  const snapshot = { ...doctorDirectoryFixture, doctors: [doctor] }
  const commands = {
    ...createDoctorProfileCommandsFixture(),
    replaceImage: vi.fn(async () => ({
      cleanupPending: false,
      profile: { ...doctor, image: { ...doctor.image, id: "replacement-image" } },
    })),
  }
  const { container } = render(<DoctorDirectory canManage commands={commands} snapshot={snapshot} />)
  const originalImage = container.querySelector("img")
  expect(originalImage).toHaveAttribute("src", privateImage)

  fireEvent.click(screen.getByRole("button", { name: "Edit Sarah Schmidt" }))
  fireEvent.change(screen.getByLabelText("Profile photo", { selector: "input" }), {
    target: { files: [new File(["portrait"], "replacement.png", { type: "image/png" })] },
  })
  fireEvent.click(screen.getByRole("button", { name: "Save doctor" }))

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit doctor" })).toBeNull())
  expect(commands.replaceImage).toHaveBeenCalledOnce()
  const replacementImage = container.querySelector("img")
  expect(replacementImage).toHaveAttribute("src", privateImage)
  expect(replacementImage).not.toHaveAttribute("srcset")
  expect(replacementImage).not.toBe(originalImage)
  expect(originalImage?.isConnected).toBe(false)
})
