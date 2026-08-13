import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import {
  createReviewSourceCommandsFixture,
  reviewSourceSnapshotFixture,
} from "./testing/review-source.fixtures"
import { Reviews } from "./Reviews"

const meta = {
  component: Reviews,
  parameters: { layout: "fullscreen" },
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Reviews",
} satisfies Meta<typeof Reviews>
export default meta
type Story = StoryObj<typeof meta>
export const VisualReference: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
  },
}
export const ReadOnly: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: false,
    snapshot: reviewSourceSnapshotFixture,
  },
}
export const Unavailable: Story = {
  args: { commands: createReviewSourceCommandsFixture(), showManagement: true },
}
