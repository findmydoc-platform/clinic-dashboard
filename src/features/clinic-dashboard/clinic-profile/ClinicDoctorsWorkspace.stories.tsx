import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ClinicDoctorsWorkspace } from "./ClinicDoctorsWorkspace"
import { createDoctorProfileCommandsFixture, doctorDirectoryFixture } from "./testing/doctor-profile.fixtures"

const meta = {
  component: ClinicDoctorsWorkspace,
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Doctors Workspace",
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  args: { canManage: true, commands: createDoctorProfileCommandsFixture(), snapshot: doctorDirectoryFixture },
} satisfies Meta<typeof ClinicDoctorsWorkspace>
export default meta
type Story = StoryObj<typeof meta>
export const Ready: Story = {}
