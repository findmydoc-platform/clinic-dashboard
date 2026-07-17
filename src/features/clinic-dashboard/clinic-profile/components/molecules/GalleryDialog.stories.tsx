import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import receptionImage from "@/assets/clinic-dashboard/reception.jpg"
import { GalleryDialog } from "./GalleryDialog"

const meta = {
  args: {
    gallery: [
      { alt: "Clinic exterior", id: "exterior", isCover: true, src: exteriorImage },
      { alt: "Reception", id: "reception", isCover: false, src: receptionImage },
    ],
    onOpenChange: fn(),
    onSelectCover: fn(),
    open: true,
  },
  component: GalleryDialog,
  tags: ["domain:clinic-profile", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Molecules/Gallery Dialog",
} satisfies Meta<typeof GalleryDialog>

export default meta
type Story = StoryObj<typeof meta>

export const SelectCover: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Clinic images" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Set cover" }))
    await expect(args.onSelectCover).toHaveBeenCalledWith("reception")

    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }))
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}
