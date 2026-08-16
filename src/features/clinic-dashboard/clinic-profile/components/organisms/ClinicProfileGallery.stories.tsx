import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileGallery } from "./ClinicProfileGallery"

const meta = {
  args: {
    gallery: clinicProfileFixture.gallery,
    galleryTotal: clinicProfileFixture.galleryTotal,
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

export const MobileReadOnlyGalleryAccess: Story = {
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ args, canvasElement }) => {
    const openGallery = within(canvasElement).getByRole("button", { name: /more images/ })
    await expect(openGallery).toBeEnabled()
    await userEvent.click(openGallery)
    await expect(args.onOpen).toHaveBeenCalledOnce()
  },
}

export const UnavailableWithoutFixtureFallback: Story = {
  args: { gallery: [], galleryTotal: 0, status: "temporarily-unavailable" },
  play: async ({ args, canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert")
    await expect(within(alert).getByText("Gallery unavailable")).toBeVisible()
    await expect(within(alert).queryByRole("img")).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    await expect(args.onOpen).toHaveBeenCalledOnce()
  },
}
