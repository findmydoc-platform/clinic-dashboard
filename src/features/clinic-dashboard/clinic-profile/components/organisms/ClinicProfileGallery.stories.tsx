import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileGallery } from "./ClinicProfileGallery"

const meta = {
  args: {
    gallery: clinicProfileFixture.gallery,
    galleryTotal: clinicProfileFixture.galleryTotal,
    isDisabled: false,
    onOpen: fn(),
  },
  component: ClinicProfileGallery,
  parameters: { layout: "padded" },
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Gallery",
} satisfies Meta<typeof ClinicProfileGallery>

export default meta
type Story = StoryObj<typeof meta>

export const CoverFirst: Story = {
  play: async ({ args, canvasElement }) => {
    const gallery = within(canvasElement).getByRole("region", { name: "Clinic image gallery" })
    await expect(within(gallery).getAllByRole("img")[0]).toHaveAccessibleName(
      "Berlin Health Clinic reception",
    )
    await userEvent.click(within(gallery).getByRole("button", { name: /more images/ }))
    await expect(args.onOpen).toHaveBeenCalledOnce()
  },
}

export const MobileReadOnly: Story = {
  args: { isDisabled: true },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: /more images/ })).toBeDisabled()
  },
}
