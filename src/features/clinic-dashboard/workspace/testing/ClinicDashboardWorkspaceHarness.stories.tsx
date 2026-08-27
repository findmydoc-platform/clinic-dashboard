import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import {
  evaluateClinicProfileCompleteness,
  evaluateClinicProfileDraftCompleteness,
  type ClinicProfileSnapshot,
  type ClinicTreatmentsSnapshot,
} from "@/features/clinic-dashboard/clinic-profile/public"
import {
  clinicGallerySnapshotFixture,
  clinicProfileSourceFixture,
  clinicTreatmentSnapshotFixture,
  createClinicGalleryCommandsFixture,
  createClinicProfileSourceCommandsFixture,
  createClinicTreatmentCommandsFixture,
  createDoctorProfileCommandsFixture,
} from "@/features/clinic-dashboard/clinic-profile/testing/public"
import { createDashboardProfileProgress } from "@/features/clinic-dashboard/dashboard/public"
import {
  dashboardProfileProgressConflict,
  dashboardProfileProgressDraft,
  dashboardProfileProgressEmpty,
  dashboardProfileProgressPublishReady,
} from "@/features/clinic-dashboard/dashboard/testing/public"
import { createReviewSourceCommandsFixture } from "@/features/clinic-dashboard/reviews/testing/public"
import {
  ClinicDashboardWorkspaceComposition,
  type ClinicDashboardWorkspaceStartState,
} from "../ClinicDashboardWorkspaceComposition"
import { authenticatedClinicContextFixture } from "./workspace.fixtures"
import { ClinicDashboardWorkspaceHarness, clinicDashboardWorkspaceFixture } from "./public"

const productionArgs = {
  prototypeMode: "presentation",
} as const

const meta = {
  args: productionArgs,
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Workspace Fixture Journeys",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>

export default meta
type Story = StoryObj<typeof meta>

const incompleteDraftProfileSourceFixture = {
  ...clinicProfileSourceFixture,
  draft: {
    ...clinicProfileSourceFixture.published,
    address: {
      ...clinicProfileSourceFixture.published.address,
      street: "",
    },
    basePublishedRevision: clinicProfileSourceFixture.published.revision,
    name: "Medicana International Istanbul draft",
    openingHours: undefined,
    revision: 1,
    supportedLanguages: ["english", "turkish", "german"],
  },
} satisfies ClinicProfileSnapshot

const publishReadyProfileSourceFixture = {
  ...clinicProfileSourceFixture,
  draft: {
    ...clinicProfileSourceFixture.published,
    basePublishedRevision: clinicProfileSourceFixture.published.revision,
    descriptionText: `${clinicProfileSourceFixture.published.descriptionText} Updated for the public profile.`,
    openingHours: {
      ...clinicProfileSourceFixture.published.openingHours,
      saturday: { closesAt: "14:00", isClosed: false, opensAt: "09:00" },
    },
    revision: 1,
  },
} satisfies ClinicProfileSnapshot

const conflictedProfileSourceFixture = {
  ...publishReadyProfileSourceFixture,
  published: {
    ...publishReadyProfileSourceFixture.published,
    revision: publishReadyProfileSourceFixture.published.revision + 1,
  },
} satisfies ClinicProfileSnapshot

const inactiveTreatmentSnapshot = {
  ...clinicTreatmentSnapshotFixture,
  offerings: clinicTreatmentSnapshotFixture.offerings.slice(0, 1).map((offering) => ({
    ...offering,
    active: false,
  })),
} satisfies ClinicTreatmentsSnapshot

function createSourceBackedProfileProgress(
  profileSourceSnapshot: ClinicProfileSnapshot,
  treatmentSnapshot: ClinicTreatmentsSnapshot,
) {
  return createDashboardProfileProgress({
    gallery: { snapshot: clinicGallerySnapshotFixture, status: "ready" },
    profile: {
      draft: evaluateClinicProfileDraftCompleteness(profileSourceSnapshot),
      published: evaluateClinicProfileCompleteness(profileSourceSnapshot),
    },
    taskActionability: {
      canEditGallery: true,
      canEditProfile: true,
      canEditTreatments: true,
    },
    treatments: treatmentSnapshot,
  })
}

function ReadAfterWriteWorkspace({
  initialProfileSourceSnapshot,
  initialTreatmentSnapshot,
  start,
}: Readonly<{
  initialProfileSourceSnapshot: ClinicProfileSnapshot
  initialTreatmentSnapshot: ClinicTreatmentsSnapshot
  start?: ClinicDashboardWorkspaceStartState
}>) {
  const [clinicGalleryCommands] = useState(() =>
    createClinicGalleryCommandsFixture(clinicGallerySnapshotFixture),
  )
  const [clinicProfileSourceCommands] = useState(() =>
    createClinicProfileSourceCommandsFixture(initialProfileSourceSnapshot),
  )
  const [clinicTreatmentCommands] = useState(() =>
    createClinicTreatmentCommandsFixture(initialTreatmentSnapshot),
  )
  const [doctorProfileCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [reviewCommands] = useState(() => createReviewSourceCommandsFixture())
  const [isSourceRefreshPending, setIsSourceRefreshPending] = useState(false)
  const [sourceState, setSourceState] = useState(() => ({
    profileProgress: createSourceBackedProfileProgress(
      initialProfileSourceSnapshot,
      initialTreatmentSnapshot,
    ),
    profileSourceSnapshot: initialProfileSourceSnapshot,
    treatmentSnapshot: initialTreatmentSnapshot,
  }))

  const refreshSources = async () => {
    setIsSourceRefreshPending(true)
    const [profileSourceSnapshot, treatmentSnapshot] = await Promise.all([
      clinicProfileSourceCommands.loadSnapshot(),
      clinicTreatmentCommands.loadTreatments(),
    ])
    setSourceState({
      profileProgress: createSourceBackedProfileProgress(profileSourceSnapshot, treatmentSnapshot),
      profileSourceSnapshot,
      treatmentSnapshot,
    })
    setIsSourceRefreshPending(false)
  }

  return (
    <ClinicDashboardWorkspaceComposition
      authenticatedContext={authenticatedClinicContextFixture}
      clinicGalleryCommands={clinicGalleryCommands}
      clinicProfileSourceCommands={clinicProfileSourceCommands}
      clinicTreatmentCommands={clinicTreatmentCommands}
      doctorProfileCommands={doctorProfileCommands}
      isSourceRefreshPending={isSourceRefreshPending}
      onSourceRefresh={() => void refreshSources()}
      persistNotificationReadStateInSession={false}
      prototypeMode="presentation"
      reviewCommands={reviewCommands}
      showPrototypeModeToggle={false}
      start={start}
      workspaceInput={{
        ...clinicDashboardWorkspaceFixture,
        profileProgress: sourceState.profileProgress,
        profileSourceSnapshot: sourceState.profileSourceSnapshot,
        treatmentSnapshot: sourceState.treatmentSnapshot,
      }}
    />
  )
}

function expectNoProfileMutationFeedback(page: ReturnType<typeof within>) {
  expect(page.queryByText("Draft saved.")).not.toBeInTheDocument()
  expect(page.queryByText("Clinic profile published.")).not.toBeInTheDocument()
  expect(page.queryByText("Gallery saved.")).not.toBeInTheDocument()
  expect(page.queryByText("Treatment added.")).not.toBeInTheDocument()
  expect(page.queryByText("Treatment updated.")).not.toBeInTheDocument()
}

export const Default: Story = {}

export const BasicInformationTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Complete basic information" }))
    const taskDialog = await page.findByRole("dialog", { name: "Complete basic information" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit basic information" }))

    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Clinic name" })).toHaveFocus())
    await expect(canvas.getByRole("button", { name: "Cancel editing" })).toBeVisible()
    await expect(canvas.queryByText("Draft available")).not.toBeInTheDocument()
    expectNoProfileMutationFeedback(page)
  },
}

export const AddressTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Complete address" }))
    const taskDialog = await page.findByRole("dialog", { name: "Complete address" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit address" }))

    await expect(await page.findByRole("dialog", { name: "Edit address" })).toBeVisible()
    await expect(canvas.queryByText("Draft available")).not.toBeInTheDocument()
    expectNoProfileMutationFeedback(page)
  },
}

export const LanguagesTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Add languages" }))
    const taskDialog = await page.findByRole("dialog", { name: "Add languages" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit languages" }))

    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Languages" })).toHaveFocus())
    await expect(canvas.getByRole("button", { name: "Cancel editing" })).toBeVisible()
    await expect(canvas.queryByText("Draft available")).not.toBeInTheDocument()
    expectNoProfileMutationFeedback(page)
  },
}

export const OpeningHoursTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Complete opening hours" }))
    const taskDialog = await page.findByRole("dialog", { name: "Complete opening hours" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit opening hours" }))

    await expect(await page.findByRole("dialog", { name: "Edit opening hours" })).toBeVisible()
    await expect(canvas.queryByText("Draft available")).not.toBeInTheDocument()
    expectNoProfileMutationFeedback(page)
  },
}

export const ClinicImagesTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Add clinic images" }))
    const taskDialog = await page.findByRole("dialog", { name: "Add clinic images" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit clinic images" }))

    const galleryEditor = await page.findByRole("region", { name: "Manage gallery" })
    await expect(within(galleryEditor).getByRole("button", { name: "Save and return" })).toBeDisabled()
    expectNoProfileMutationFeedback(page)
  },
}

export const TreatmentsTaskRoutesToEditor: Story = {
  args: { profileProgress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Add treatments" }))
    const taskDialog = await page.findByRole("dialog", { name: "Add treatments" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Edit treatments" }))

    const treatmentEditor = await page.findByRole("dialog", { name: "Add treatment" })
    await expect(within(treatmentEditor).getByRole("button", { name: "Add treatment" })).toBeDisabled()
    expectNoProfileMutationFeedback(page)
  },
}

export const CompleteDraftTaskRoutesToFirstMissingArea: Story = {
  args: {
    profileProgress: dashboardProfileProgressDraft,
    profileSourceSnapshot: incompleteDraftProfileSourceFixture,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Complete profile draft" }))
    const taskDialog = await page.findByRole("dialog", { name: "Complete profile draft" })
    await expect(within(taskDialog).getByText("Address")).toBeVisible()
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Continue editing" }))

    await expect(await page.findByRole("dialog", { name: "Edit address" })).toBeVisible()
    expectNoProfileMutationFeedback(page)
  },
}

export const PublishReadyTaskRoutesToReview: Story = {
  args: {
    profileProgress: dashboardProfileProgressPublishReady,
    profileSourceSnapshot: publishReadyProfileSourceFixture,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Publish profile changes" }))
    const taskDialog = await page.findByRole("dialog", { name: "Publish profile changes" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Review & publish" }))

    const reviewDialog = await page.findByRole("dialog", { name: "Review and publish" })
    await expect(within(reviewDialog).getByRole("button", { name: "Publish changes" })).toBeEnabled()
    expectNoProfileMutationFeedback(page)
  },
}

export const ProfilePublishRefreshesSharedProgress: Story = {
  render: () => (
    <ReadAfterWriteWorkspace
      initialProfileSourceSnapshot={publishReadyProfileSourceFixture}
      initialTreatmentSnapshot={clinicTreatmentSnapshotFixture}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const publishTask = canvas.getByRole("button", {
      name: "View details for Publish profile changes",
    })

    await userEvent.click(publishTask)
    const taskDialog = await page.findByRole("dialog", { name: "Publish profile changes" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Review & publish" }))

    const reviewDialog = await page.findByRole("dialog", { name: "Review and publish" })
    await userEvent.click(within(reviewDialog).getByRole("button", { name: "Publish changes" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Review and publish" })).not.toBeInTheDocument(),
    )

    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: "View details for Publish profile changes" }),
      ).not.toBeInTheDocument(),
    )
    await expect(canvas.getAllByText("100%")[0]).toBeVisible()
  },
}

export const TreatmentSaveRefreshesSharedProgress: Story = {
  render: () => (
    <ReadAfterWriteWorkspace
      initialProfileSourceSnapshot={clinicProfileSourceFixture}
      initialTreatmentSnapshot={inactiveTreatmentSnapshot}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await expect(canvas.getAllByText("83%")[0]).toBeVisible()
    await expect(canvas.getByRole("button", { name: "View details for Add treatments" })).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "Edit Laser teeth whitening" }))
    const treatmentDialog = await page.findByRole("dialog", { name: "Edit treatment" })
    await userEvent.click(within(treatmentDialog).getByRole("checkbox", { name: "Publicly active" }))
    await userEvent.click(within(treatmentDialog).getByRole("button", { name: "Save changes" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Edit treatment" })).not.toBeInTheDocument(),
    )

    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    await waitFor(() => expect(canvas.getAllByText("100%")[0]).toBeVisible())
    await expect(
      canvas.queryByRole("button", { name: "View details for Add treatments" }),
    ).not.toBeInTheDocument()
  },
}

export const ConflictTaskRoutesToExistingAlert: Story = {
  args: {
    profileProgress: dashboardProfileProgressConflict,
    profileSourceSnapshot: conflictedProfileSourceFixture,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "View details for Review profile changes" }))
    const taskDialog = await page.findByRole("dialog", { name: "Review profile changes" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Review changes" }))

    const conflictAlert = await canvas.findByRole("alert")
    await expect(within(conflictAlert).getByText("Profile changed elsewhere")).toBeVisible()
    await waitFor(() => expect(conflictAlert).toHaveFocus())
    await expect(page.queryByRole("dialog", { name: "Review and publish" })).not.toBeInTheDocument()
    expectNoProfileMutationFeedback(page)
  },
}

export const VisualReferenceLocationSwitching: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )
    const locationSelector = header.getByRole("button", { name: /Switch clinic location/ })

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )
    await expect(header.getByText("Berlin Health Group")).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
    await expect(dashboardLocation.getByText("Charlottenburg, Berlin")).toBeInTheDocument()
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Location changed to Berlin Health Clinic — Charlottenburg.",
    )
    await expect(canvas.getAllByText("100%")[0]).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Inquiries" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByText("Maya K.")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByText("Medicana International Istanbul")).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Open account menu for Sarah Schmidt" }),
    ).toBeInTheDocument()
  },
}

export const PresentationLocationSwitching: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )
    const locationSelector = header.getByRole("button", { name: /Switch clinic location/ })

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )
    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
  },
}

export const LocationSwitchingAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const locationSelector = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )
    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const Mobile: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    await userEvent.click(
      within(canvas.getByRole("dialog", { name: "Clinic navigation" })).getByRole("button", {
        name: "Inquiries",
      }),
    )
    await expect(await canvas.findByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument()
  },
}

export const VisualReferenceSubscriptions: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const subscriptions = canvas.getByRole("button", { name: "Subscriptions" })

    await userEvent.click(subscriptions)

    await expect(subscriptions).toHaveAttribute("aria-current", "page")
    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    await expect(
      canvas.getByText(
        "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationSubscriptionsPlaceholder: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="presentation" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Subscriptions" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    const region = canvas.getByRole("region", { name: "Subscriptions" })
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
  },
}

export const SubscriptionsAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Subscriptions" })

    await expect(within(region).getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const SubscriptionsDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
  },
}

export const VisualReferenceCertificatesAndAccreditations: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const destination = canvas.getByRole("button", { name: "Credentials" })

    await userEvent.click(destination)

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(
        "This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this demo.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationCredentialsPlaceholder: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="presentation"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Credentials" })).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    const region = canvas.getByRole("region", { name: "Certificates and accreditations" })
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
  },
}

export const CertificatesAndAccreditationsAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="visual-reference"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))

    const navigation = within(canvas.getByRole("dialog", { name: "Clinic navigation" }))
    const destination = navigation.getByRole("button", { name: "Credentials" })
    const label = within(destination).getByText("Credentials")

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(destination.scrollWidth).toBeLessThanOrEqual(destination.clientWidth)
    await expect(destination.scrollHeight).toBeLessThanOrEqual(destination.clientHeight)
    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    await expect(label).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const CertificatesAndAccreditationsDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="visual-reference"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
  },
}

export const PotsdamWorkspaceContent: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const locationSelector = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(locationSelector)
    await userEvent.click(await page.findByRole("menuitem", { name: /Berlin Health Clinic — Potsdam/ }))
    await expect(canvas.getAllByText("100%")[0]).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Inquiries" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByText("Maya K.")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByText("Medicana International Istanbul")).toBeInTheDocument()
  },
}

export const OrganizationNotificationsShowLocations: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => (
    <ClinicDashboardWorkspaceHarness notificationState={{ isOpen: true }} prototypeMode="visual-reference" />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const notificationList = page.getByRole("list", { name: "New notifications" })

    await expect(within(notificationList).getByText("Mitte")).toBeInTheDocument()
    await expect(within(notificationList).getByText("Charlottenburg")).toBeInTheDocument()
  },
}

export const DemoBadgeAndFourImageGallery: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText("Mixed data")[0]).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByRole("button", { name: "Manage gallery" })).toBeInTheDocument()
  },
}

export const GallerySaveReturnsWithToast: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "Manage gallery" }))

    const editor = await page.findByRole("region", { name: "Manage gallery" })
    await userEvent.type(
      within(editor).getByRole("textbox", { name: "Caption (optional)" }),
      "A welcoming reception for patients.",
    )
    await userEvent.click(within(editor).getByRole("button", { name: "Save and return" }))

    await expect(canvas.getByRole("heading", { name: "Clinic profile" })).toBeVisible()
    await waitFor(() =>
      expect(page.getAllByText("Gallery saved.").some((element) => element.getClientRects().length > 0)).toBe(
        true,
      ),
    )
  },
}

export const GalleryLocationSwitchUsesLeaveGuard: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const locationSelector = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "Manage gallery" }))
    const editor = await page.findByRole("region", { name: "Manage gallery" })
    await userEvent.type(
      within(editor).getByRole("textbox", { name: "Caption (optional)" }),
      "Unsaved location-specific caption",
    )

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )

    const leaveDialog = await page.findByRole("alertdialog", { name: "Save changes before leaving?" })
    await waitFor(() => expect(leaveDialog).toBeVisible())
    await expect(within(leaveDialog).getByText(/Continue only after saving or discarding them/)).toBeVisible()
    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )

    await userEvent.click(within(leaveDialog).getByRole("button", { name: "Discard changes" }))
    await waitFor(() =>
      expect(locationSelector).toHaveAccessibleName(
        /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
      ),
    )
  },
}

export const FourImageGalleryDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "Manage gallery" }))

    const editor = await page.findByRole("region", { name: "Manage gallery" })
    await expect(canvasElement.ownerDocument.documentElement).toHaveClass("dark")
    await expect(within(editor).getAllByText("Main image")[0]).toBeVisible()
    await expect(within(editor).getByRole("button", { name: "More image actions" })).toBeVisible()
    await expect(within(editor).getByRole("button", { name: "Save and return" })).toBeDisabled()
  },
}
