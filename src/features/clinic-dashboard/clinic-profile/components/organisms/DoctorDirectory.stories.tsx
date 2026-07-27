import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "../../testing/doctor-profile.fixtures"
import { DoctorDirectory } from "./DoctorDirectory"

const meta = {
  args: {
    canManage: true,
    commands: createDoctorProfileCommandsFixture(),
    snapshot: doctorDirectoryFixture,
  },
  component: DoctorDirectory,
  parameters: { layout: "padded" },
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Doctor Directory",
} satisfies Meta<typeof DoctorDirectory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Sarah Schmidt")).toBeVisible()
    await expect(canvas.getByText("Noah Williams")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Add doctor" }))
    await expect(canvas.getByRole("dialog", { name: "Add doctor" })).toBeVisible()
  },
}

export const Empty: Story = {
  args: {
    snapshot: {
      doctors: [],
      medicalSpecialties: doctorDirectoryFixture.medicalSpecialties,
      status: "ready",
    },
  },
}

export const TemporarilyUnavailable: Story = {
  args: {
    snapshot: {
      doctors: [],
      medicalSpecialties: [],
      status: "temporarily-unavailable",
    },
  },
}

export const ReadOnly: Story = {
  args: {
    canManage: false,
  },
}
