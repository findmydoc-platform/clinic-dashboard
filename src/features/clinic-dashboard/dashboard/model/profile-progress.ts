import type {
  ClinicGalleryLoadStatus,
  ClinicGallerySnapshot,
  ClinicProfileCompletenessResult,
  ClinicProfileCompletenessMissingFieldId,
  ClinicProfileDraftCompleteness,
  ClinicTreatmentsSnapshot,
} from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "./profile-tasks"
import type { DashboardMetric } from "./reporting"

const dashboardProfileAreaIds = [
  "basic-information",
  "address",
  "languages",
  "opening-hours",
  "clinic-images",
  "treatments",
] as const

export type DashboardProfileAreaId = (typeof dashboardProfileAreaIds)[number]

export type DashboardProfileProgressArea = Readonly<{
  complete: boolean
  id: DashboardProfileAreaId
  missingItems: readonly string[]
}>

export type DashboardProfileProgressReady = Readonly<{
  areas: readonly DashboardProfileProgressArea[]
  completedAreaCount: number
  percent: 0 | 17 | 33 | 50 | 67 | 83 | 100
  status: "ready"
  tasks: readonly DashboardProfileTask[]
  totalAreaCount: 6
}>

export type DashboardProfileProgressState =
  | DashboardProfileProgressReady
  | Readonly<{
      status: "loading"
    }>
  | Readonly<{
      message: string
      reason:
        | "duplicate-gallery-record"
        | "gallery-unavailable"
        | "profile-contract-error"
        | "profile-unavailable"
        | "treatments-unavailable"
      status: "error"
    }>

export type DashboardProfileProgressInput = Readonly<{
  gallery: Readonly<{
    snapshot?: ClinicGallerySnapshot
    status: ClinicGalleryLoadStatus
  }>
  profile?: Readonly<{
    draft: ClinicProfileDraftCompleteness
    published: ClinicProfileCompletenessResult
  }>
  taskActionability: Readonly<{
    canEditGallery: boolean
    canEditProfile: boolean
    canEditTreatments: boolean
  }>
  treatments: ClinicTreatmentsSnapshot
}>

const percentByCompletedAreaCount = [0, 17, 33, 50, 67, 83, 100] as const

export function createDashboardProfileCompletionMetric(
  progress: DashboardProfileProgressState,
): DashboardMetric {
  if (progress.status === "ready") {
    return {
      id: "completion",
      label: "Public profile completion",
      progress: progress.percent,
      value: `${progress.percent}%`,
    }
  }

  return {
    id: "completion",
    label: "Public profile completion",
    note: progress.status === "loading" ? "Loading public profile" : "Unavailable",
    value: "—",
  }
}

const profileAreaLabels = {
  address: "Address",
  "basic-information": "Basic information",
  languages: "Languages",
  "opening-hours": "Opening hours",
} as const

const missingFieldLabels = {
  "address.cityId": "City",
  "address.houseNumber": "House number",
  "address.street": "Street",
  "address.zipCode": "Postal code",
  descriptionText: "Clinic description",
  name: "Clinic name",
  "openingHours.friday": "Friday",
  "openingHours.monday": "Monday",
  "openingHours.saturday": "Saturday",
  "openingHours.sunday": "Sunday",
  "openingHours.thursday": "Thursday",
  "openingHours.tuesday": "Tuesday",
  "openingHours.wednesday": "Wednesday",
  supportedLanguages: "Supported language",
} as const satisfies Readonly<Record<ClinicProfileCompletenessMissingFieldId, string>>

const categoryTaskContent = {
  address: {
    benefit: "A complete address helps patients plan their journey and find your clinic.",
    completionCriteria: "Publish valid values for street, house number, postal code, and city.",
    destination: "address",
    destinationLabel: "Edit address",
    label: "Complete address",
  },
  "basic-information": {
    benefit:
      "An accurate clinic name and clear description help patients identify your clinic and understand whether it may fit their needs.",
    completionCriteria: "Publish a valid clinic name and description.",
    destination: "basic-information",
    destinationLabel: "Edit basic information",
    label: "Complete basic information",
  },
  "clinic-images": {
    benefit:
      "Clear, representative images help patients understand what to expect before they contact your clinic.",
    completionCriteria:
      "Publish at least three distinct clinic images. The first published image is the main image.",
    destination: "gallery",
    destinationLabel: "Edit clinic images",
    guidance:
      "Choose one clear main image that represents your clinic, then add at least two distinct supporting views. Avoid near-duplicates.",
    label: "Add clinic images",
  },
  languages: {
    benefit:
      "Listing supported languages helps patients see whether communication in their preferred language may be possible.",
    completionCriteria: "Publish at least one supported language.",
    destination: "languages",
    destinationLabel: "Edit languages",
    label: "Add languages",
  },
  "opening-hours": {
    benefit:
      "Current opening hours help patients understand when your clinic is available and whether a visit fits their schedule.",
    completionCriteria:
      "Configure every day as either closed or with a valid opening and closing time, then publish the changes.",
    destination: "opening-hours",
    destinationLabel: "Edit opening hours",
    label: "Complete opening hours",
  },
  treatments: {
    benefit:
      "Published treatments help patients see what care your clinic offers and whether it may match their needs.",
    completionCriteria: "Publish at least one active treatment.",
    destination: "treatments",
    destinationLabel: "Edit treatments",
    label: "Add treatments",
  },
} as const

function missingImageItems(publishedImageCount: number) {
  if (publishedImageCount === 0) return ["1 main image", "2 supporting images"]
  const supportingImageCount = Math.max(0, 3 - publishedImageCount)
  return supportingImageCount === 1 ? ["1 supporting image"] : [`${supportingImageCount} supporting images`]
}

function joinMissingItems(items: readonly string[]) {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`
}

function createCategoryTask(area: DashboardProfileProgressArea): DashboardProfileTask {
  const content = categoryTaskContent[area.id]

  return {
    actionLabel: "View details",
    areaId: area.id,
    benefit: content.benefit,
    completionCriteria: content.completionCriteria,
    description: `Missing: ${joinMissingItems(area.missingItems)}.`,
    destination: content.destination,
    destinationLabel: content.destinationLabel,
    ...(area.id === "clinic-images" ? { guidance: categoryTaskContent[area.id].guidance } : {}),
    id: area.id,
    kind: "category",
    label: content.label,
    missingItems: area.missingItems,
  }
}

function createDraftTask(draft: ClinicProfileDraftCompleteness): DashboardProfileTask | undefined {
  if (draft.state === "none") return undefined

  if (draft.state === "incomplete") {
    const missingItems = draft.missingAreas.map((areaId) => profileAreaLabels[areaId])
    const missingAreaCount = 4 - draft.completedAreaCount
    const firstMissingArea = draft.missingAreas[0] ?? "basic-information"

    return {
      actionLabel: "View details",
      completedAreaCount: draft.completedAreaCount,
      completionCriteria: "Complete all 4 profile areas before reviewing the draft for publication.",
      description: `${draft.completedAreaCount} ${draft.completedAreaCount === 1 ? "area is" : "areas are"} ready in your draft. ${missingAreaCount} ${missingAreaCount === 1 ? "area still needs" : "areas still need"} attention.`,
      destination: firstMissingArea,
      destinationLabel: "Continue editing",
      id: "complete-profile-draft",
      kind: "complete-draft",
      label: "Complete profile draft",
      missingItems,
      totalAreaCount: 4,
    }
  }

  if (draft.state === "publish-ready") {
    const changedItems = draft.changedAreas.map((areaId) => profileAreaLabels[areaId])
    const changedAreaCount = changedItems.length

    return {
      actionLabel: "View details",
      changedItems,
      description: `${changedAreaCount} profile ${changedAreaCount === 1 ? "area is" : "areas are"} ready to publish.`,
      destination: "review-publish",
      destinationLabel: "Review & publish",
      id: "publish-profile-changes",
      kind: "publish-draft",
      label: "Publish profile changes",
    }
  }

  return {
    actionLabel: "View details",
    description:
      "The public profile changed after this draft was created. Review the latest version before continuing.",
    destination: "conflict",
    destinationLabel: "Review changes",
    id: "review-profile-changes",
    kind: "review-draft",
    label: "Review profile changes",
  }
}

export function createDashboardProfileProgress({
  gallery,
  profile,
  taskActionability,
  treatments,
}: DashboardProfileProgressInput): DashboardProfileProgressState {
  if (!profile) {
    return {
      message: "Public profile progress is temporarily unavailable.",
      reason: "profile-unavailable",
      status: "error",
    }
  }
  if (profile.published.status !== "ready") {
    return {
      message: "Public profile progress is temporarily unavailable.",
      reason: "profile-contract-error",
      status: "error",
    }
  }
  if (gallery.status !== "ready" || !gallery.snapshot) {
    return {
      message: "Public profile progress is temporarily unavailable.",
      reason: "gallery-unavailable",
      status: "error",
    }
  }
  if (treatments.status !== "ready") {
    return {
      message: "Public profile progress is temporarily unavailable.",
      reason: "treatments-unavailable",
      status: "error",
    }
  }

  const publishedGalleryItems = gallery.snapshot.items.filter((item) => item.status === "published")
  const imageIds = new Set(publishedGalleryItems.map((item) => item.id))
  if (imageIds.size !== publishedGalleryItems.length) {
    return {
      message: "Public profile progress is temporarily unavailable.",
      reason: "duplicate-gallery-record",
      status: "error",
    }
  }

  const profileAreas = profile.published.areas.map((area) => ({
    complete: area.complete,
    id: area.id,
    missingItems: area.missingFields.map((field) => missingFieldLabels[field] ?? field),
  }))
  const imageMissingItems = missingImageItems(publishedGalleryItems.length)
  const areas = [
    ...profileAreas,
    {
      complete: publishedGalleryItems.length >= 3,
      id: "clinic-images",
      missingItems: publishedGalleryItems.length >= 3 ? [] : imageMissingItems,
    },
    {
      complete: treatments.offerings.some((offering) => offering.active),
      id: "treatments",
      missingItems: treatments.offerings.some((offering) => offering.active) ? [] : ["1 active treatment"],
    },
  ] satisfies readonly DashboardProfileProgressArea[]
  const completedAreaCount = areas.filter((area) => area.complete).length
  const profileTasks = taskActionability.canEditProfile
    ? profile.draft.state === "none"
      ? areas
          .filter((area) => !area.complete && area.id !== "clinic-images" && area.id !== "treatments")
          .map(createCategoryTask)
      : [createDraftTask(profile.draft)].filter((task): task is DashboardProfileTask => task !== undefined)
    : []
  const galleryAndTreatmentTasks = areas
    .filter(
      (area) =>
        !area.complete &&
        ((area.id === "clinic-images" && taskActionability.canEditGallery) ||
          (area.id === "treatments" && taskActionability.canEditTreatments)),
    )
    .map(createCategoryTask)

  return {
    areas,
    completedAreaCount,
    percent: percentByCompletedAreaCount[completedAreaCount] ?? 0,
    status: "ready",
    tasks: [...profileTasks, ...galleryAndTreatmentTasks],
    totalAreaCount: 6,
  }
}
