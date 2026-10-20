// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { Avatar } from "@/components/ui/avatar"
import { DoctorDirectory } from "@/features/clinic-dashboard/clinic-profile/components/organisms/DoctorDirectory"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/doctor-profile.fixtures"

const privateImage = "/api/dashboard/clinics/clinic-1/doctors/doctor-sarah-schmidt/image"

afterEach(cleanup)

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
