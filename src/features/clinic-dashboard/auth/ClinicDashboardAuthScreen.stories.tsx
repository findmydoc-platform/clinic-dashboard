import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicDashboardAuthScreen } from "./ClinicDashboardAuthScreen"
import type { ClinicDashboardAuthApiResult } from "./browser/auth-api"

const meta = {
  args: { mode: "login" },
  component: ClinicDashboardAuthScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:stable"],
  title: "Clinic Dashboard/Workspace/Pages/Authentication",
} satisfies Meta<typeof ClinicDashboardAuthScreen>

export default meta
type Story = StoryObj<typeof meta>

const successfulRedirect = (redirectTo: string) =>
  fn(async () => ({ body: { redirectTo }, ok: true }) as const)

export const Login: Story = {}

export const LoginInvalidCredentials: Story = {
  args: {
    mode: "login",
    submitAction: fn(async () => ({ code: "INVALID_CREDENTIALS", ok: false }) as const),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "wrong-password")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    await expect(canvas.getByRole("alert")).toHaveTextContent("email address or password is incorrect")
  },
}

export const LoginPending: Story = {
  args: {
    mode: "login",
    submitAction: fn(() => new Promise<ClinicDashboardAuthApiResult>(() => undefined)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toBeDisabled()
  },
}

export const ResetRequest: Story = { args: { mode: "reset-request" } }

export const ResetRequestAccepted: Story = {
  args: {
    mode: "reset-request",
    submitAction: fn(async () => ({ body: { accepted: true }, ok: true }) as const),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Send reset instructions" }))
    await expect(canvas.getByRole("status")).toHaveTextContent("Check your inbox")
  },
}

export const InviteConfirmation: Story = {
  args: {
    mode: "confirm",
    submitAction: successfulRedirect("/auth/invite/complete"),
    type: "invite",
  },
}

export const RecoveryConfirmation: Story = {
  args: {
    mode: "confirm",
    submitAction: successfulRedirect("/auth/password/reset/complete"),
    type: "recovery",
  },
}

export const CompleteInvite: Story = { args: { flow: "invite", mode: "complete-password" } }
export const CompleteRecovery: Story = { args: { flow: "recovery", mode: "complete-password" } }

export const AccessPending: Story = { args: { mode: "access", state: "denied" } }

export const AccountUnavailable: Story = {
  args: { mode: "access", state: "account-unavailable" },
}

export const ServiceOutage: Story = {
  args: { mode: "access", state: "temporarily-unavailable" },
}

export const ServiceOutageDark: Story = {
  args: { mode: "access", state: "temporarily-unavailable" },
  globals: { theme: "dark" },
}

export const LoginMobile: Story = {
  args: { mode: "login" },
  globals: { viewport: { value: "mobile320Short" } },
}
