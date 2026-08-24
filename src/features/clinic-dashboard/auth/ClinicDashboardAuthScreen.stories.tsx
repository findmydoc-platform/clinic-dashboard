import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicDashboardAuthScreen } from "./ClinicDashboardAuthScreen"
import type { ClinicDashboardAuthApiResult } from "./browser/auth-api"
import type { ClinicDashboardAuthErrorCode } from "./model/auth"

const meta = {
  args: { mode: "login" },
  component: ClinicDashboardAuthScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:stable"],
  title: "Clinic Dashboard/Workspace/Pages/Authentication",
} satisfies Meta<typeof ClinicDashboardAuthScreen>

export default meta
type Story = StoryObj<typeof meta>

const rejectedAction = (code: ClinicDashboardAuthErrorCode) => fn(async () => ({ code, ok: false }) as const)

const successfulRedirect = (redirectTo: string) =>
  fn(async () => ({ body: { redirectTo }, ok: true }) as const)

const pendingAction = () => fn(() => new Promise<ClinicDashboardAuthApiResult>(() => undefined))
const serviceOutageReload = fn()

export const Login: Story = {
  args: {
    mode: "login",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
}

export const LoginSuccess: Story = {
  args: {
    mode: "login",
    navigateAction: fn(),
    submitAction: successfulRedirect("/"),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    await expect(args.submitAction).toHaveBeenCalledWith("/api/auth/login", {
      email: "staff@example.com",
      next: "/",
      password: "password123",
    })
    await expect(args.navigateAction).toHaveBeenCalledWith("/")
    await expect(canvas.getByRole("button", { name: "Opening dashboard…" })).toBeDisabled()
    await expect(canvas.getByRole("status")).toHaveTextContent("Signed in. Opening your dashboard.")
    await expect(canvas.getByRole("textbox", { name: "Email address" })).toBeDisabled()
    await expect(canvas.getByLabelText("Password")).toBeDisabled()
    const resetLink = canvas.getByRole("link", { name: "Forgot your password?" })
    await expect(resetLink).toHaveAttribute("aria-disabled", "true")
    await expect(resetLink).toHaveAttribute("tabindex", "-1")
  },
}

export const InviteCompletedLogin: Story = {
  args: {
    initialStatus: "invite-complete",
    mode: "login",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Your password is set")
  },
}

export const RecoveryCompletedLogin: Story = {
  args: {
    initialStatus: "recovery-complete",
    mode: "login",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Your password was reset")
  },
}

export const LoginInvalidCredentials: Story = {
  args: {
    mode: "login",
    submitAction: rejectedAction("INVALID_CREDENTIALS"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "wrong-password")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    const alert = canvas.getByRole("alert")
    await expect(alert).toHaveTextContent("email address or password is incorrect")
    await expect(alert).toHaveFocus()
  },
}

export const LoginPending: Story = {
  args: {
    mode: "login",
    submitAction: pendingAction(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.type(canvas.getByLabelText("Password"), "password123")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    await expect(canvas.getByRole("button", { name: "Signing in…" })).toBeDisabled()
    await expect(canvas.getByRole("status")).toHaveTextContent("Signing in")
  },
}

export const ResetRequest: Story = {
  args: {
    mode: "reset-request",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
}

export const ResetRequestAccepted: Story = {
  args: {
    mode: "reset-request",
    submitAction: fn(async () => ({ body: { accepted: true }, ok: true }) as const),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Send reset instructions" }))
    const status = canvas.getByRole("status")
    await expect(status).toHaveTextContent("Check your inbox")
    await expect(status).toHaveFocus()
  },
}

export const ResetRequestError: Story = {
  args: {
    mode: "reset-request",
    submitAction: rejectedAction("AUTH_TEMPORARILY_UNAVAILABLE"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Send reset instructions" }))
    await expect(canvas.getByRole("alert")).toHaveFocus()
  },
}

export const ResetRequestPending: Story = {
  args: {
    mode: "reset-request",
    submitAction: pendingAction(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole("textbox", { name: "Email address" }), "staff@example.com")
    await userEvent.click(canvas.getByRole("button", { name: "Send reset instructions" }))
    await expect(canvas.getByRole("button", { name: "Requesting reset…" })).toBeDisabled()
  },
}

export const InviteConfirmation: Story = {
  args: {
    mode: "confirm",
    navigateAction: fn(),
    submitAction: successfulRedirect("/auth/invite/complete"),
    type: "invite",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Continue invitation" }))
    await expect(args.submitAction).toHaveBeenCalledWith("/api/auth/callback", {})
    await expect(args.navigateAction).toHaveBeenCalledWith("/auth/invite/complete")
  },
}

export const RecoveryConfirmation: Story = {
  args: {
    mode: "confirm",
    navigateAction: fn(),
    submitAction: successfulRedirect("/auth/password/reset/complete"),
    type: "recovery",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Continue password reset" }))
    await expect(args.navigateAction).toHaveBeenCalledWith("/auth/password/reset/complete")
  },
}

export const ConfirmationError: Story = {
  args: {
    mode: "confirm",
    submitAction: rejectedAction("INVALID_OR_EXPIRED_LINK"),
    type: "invite",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Continue invitation" }))
    await expect(canvas.getByRole("alert")).toHaveFocus()
  },
}

export const ConfirmationPending: Story = {
  args: {
    mode: "confirm",
    submitAction: pendingAction(),
    type: "recovery",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Continue password reset" }))
    await expect(canvas.getByRole("button", { name: "Confirming…" })).toBeDisabled()
  },
}

export const CompleteInvite: Story = {
  args: {
    flow: "invite",
    mode: "complete-password",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
}

export const CompleteInviteMismatch: Story = {
  args: {
    flow: "invite",
    mode: "complete-password",
    submitAction: successfulRedirect("/login?status=invite-complete"),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const password = canvas.getByLabelText("Password")
    await userEvent.type(password, "password-one")
    await userEvent.type(canvas.getByLabelText("Confirm password"), "password-two")
    await userEvent.click(canvas.getByRole("button", { name: "Save password" }))
    await expect(password).toHaveAttribute("aria-invalid", "true")
    await expect(canvas.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true")
    await expect(password).toHaveFocus()
    await expect(args.submitAction).not.toHaveBeenCalled()
  },
}

export const CompleteRecovery: Story = {
  args: {
    flow: "recovery",
    mode: "complete-password",
    navigateAction: fn(),
    submitAction: successfulRedirect("/login?status=recovery-complete"),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Password"), "new-password")
    await userEvent.type(canvas.getByLabelText("Confirm password"), "new-password")
    await userEvent.click(canvas.getByRole("button", { name: "Save password" }))
    await expect(args.navigateAction).toHaveBeenCalledWith("/login?status=recovery-complete")
  },
}

export const CompleteRecoveryDark: Story = {
  args: {
    flow: "recovery",
    mode: "complete-password",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
  globals: { theme: "dark" },
}

export const AccessPending: Story = {
  args: {
    mode: "access",
    state: "denied",
    submitAction: rejectedAction("SERVICE_TEMPORARILY_UNAVAILABLE"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Sign out" }))
    await expect(canvas.getByRole("alert")).toHaveFocus()
  },
}

export const AccountUnavailable: Story = {
  args: {
    mode: "access",
    state: "account-unavailable",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
}

export const ServiceOutage: Story = {
  args: {
    mode: "access",
    reloadAction: serviceOutageReload,
    state: "temporarily-unavailable",
    submitAction: rejectedAction("SERVICE_TEMPORARILY_UNAVAILABLE"),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }))
    await expect(serviceOutageReload).toHaveBeenCalledOnce()
  },
}

export const ServiceOutageDark: Story = {
  args: {
    mode: "access",
    reloadAction: fn(),
    state: "temporarily-unavailable",
    submitAction: rejectedAction("SERVICE_TEMPORARILY_UNAVAILABLE"),
  },
  globals: { theme: "dark" },
}

export const ConfirmationMobile: Story = {
  args: {
    mode: "confirm",
    submitAction: rejectedAction("REQUEST_REJECTED"),
    type: "invite",
  },
  globals: { viewport: { value: "mobile320Short" } },
}

export const AccessPendingMobile: Story = {
  args: {
    mode: "access",
    state: "denied",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
  globals: { viewport: { value: "mobile320Short" } },
}

export const LoginMobile: Story = {
  args: {
    mode: "login",
    submitAction: rejectedAction("REQUEST_REJECTED"),
  },
  globals: { viewport: { value: "mobile320Short" } },
}
