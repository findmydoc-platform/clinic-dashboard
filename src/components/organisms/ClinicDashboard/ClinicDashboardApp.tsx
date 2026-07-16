"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { DashboardPeriodControl } from "@/components/molecules/DashboardPeriodControl"
import { ProfileTaskDialog } from "@/components/molecules/ProfileTaskDialog"
import { SupportDialog } from "@/components/molecules/SupportDialog"
import {
  AddressDialog,
  GalleryDialog,
  OpeningHoursDialog,
  SpecialtyDialog,
} from "@/components/molecules/ClinicProfileDialogs"
import { ClinicDashboardTemplate } from "@/components/templates/ClinicDashboardTemplate"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { DashboardOverview } from "./DashboardOverview"
import { MessagesWorkspace } from "./MessagesWorkspace"
import { ReviewsManagement } from "./ReviewsManagement"
import type { ReviewsManagementData } from "./ReviewsManagement"
import { ClinicProfileEditor } from "./ClinicProfileEditor"
import { PatientProfileDialog, TeamMemberDialog, TreatmentDialog } from "./ClinicDashboardDialogs"
import type {
  ClinicDashboardDialog,
  ClinicDashboardSection,
  ClinicDashboardVariant,
} from "@/lib/clinic-dashboard/visibility"
import { isClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import { markAllNotificationsAsRead as getAllNotificationReadIds } from "@/lib/clinic-dashboard/notifications"
import type { ClinicProfileDestination, DashboardProfileTask } from "@/lib/clinic-dashboard/profile-tasks"
import type { DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"
import {
  cloneClinicProfile,
  isClinicProfileDirty,
  type ClinicProfileDraft,
  type ClinicTeamMember,
  type ClinicTreatment,
} from "@/lib/clinic-dashboard/profile"
import {
  createFixtureClinicDashboardDataSource,
  type ClinicDashboardDataSource,
} from "@/lib/clinic-dashboard/prototype-data-source"
import type { ClinicReview } from "@/lib/clinic-dashboard/reviews"

const INTERFACE_MODE_SESSION_KEY = "clinic-dashboard-interface-mode"
const INTERFACE_MODE_CHANGE_EVENT = "clinic-dashboard-interface-mode-change"
const NOTIFICATION_READ_STATE_SESSION_KEY = "clinic-dashboard-notification-read-state"
const NOTIFICATION_READ_STATE_CHANGE_EVENT = "clinic-dashboard-notification-read-state-change"
const defaultDataSource = createFixtureClinicDashboardDataSource()

export type ClinicDashboardInitialData = {
  profile: ClinicProfileDraft
  reviews: ReviewsManagementData
}

type ProfileUndo =
  | { index: number; item: ClinicTeamMember; kind: "team" }
  | { index: number; item: ClinicTreatment; kind: "treatment" }

function getStoredFullInterface() {
  return window.sessionStorage.getItem(INTERFACE_MODE_SESSION_KEY) === "visual-reference"
}

function getServerFullInterface() {
  return false
}

function subscribeToInterfaceMode(onStoreChange: () => void) {
  window.addEventListener(INTERFACE_MODE_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(INTERFACE_MODE_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function getStoredNotificationReadState() {
  try {
    return window.sessionStorage.getItem(NOTIFICATION_READ_STATE_SESSION_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

function getServerNotificationReadState() {
  return "[]"
}

function getNotificationReadIds(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

function storeNotificationReadIds(ids: readonly string[]) {
  try {
    window.sessionStorage.setItem(NOTIFICATION_READ_STATE_SESSION_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event(NOTIFICATION_READ_STATE_CHANGE_EVENT))
  } catch {
    // Session storage is an optional enhancement for this local prototype.
  }
}

function subscribeToNotificationReadState(onStoreChange: () => void) {
  window.addEventListener(NOTIFICATION_READ_STATE_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(NOTIFICATION_READ_STATE_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export type ClinicDashboardAppProps = {
  dataSource?: ClinicDashboardDataSource
  initialData?: ClinicDashboardInitialData
  initialDialog?: ClinicDashboardDialog
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  initialSection?: ClinicDashboardSection
  persistInterfaceModeInSession?: boolean
  showInterfaceModeToggle?: boolean
  variant: ClinicDashboardVariant
}

export function ClinicDashboardApp({
  dataSource = defaultDataSource,
  initialData = clinicDashboardFixture as ClinicDashboardInitialData,
  initialDialog,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  initialSection = "dashboard",
  persistInterfaceModeInSession = false,
  showInterfaceModeToggle = false,
  variant,
}: ClinicDashboardAppProps) {
  if (!isClinicDashboardVariant(variant)) throw new Error(`Unsupported clinic dashboard variant: ${variant}`)

  const [activeSection, setActiveSection] = useState<ClinicDashboardSection>(initialSection)
  const [reportingPeriod, setReportingPeriod] = useState<DashboardReportingPeriod>(initialReportingPeriod)
  const [notificationsOpen, setNotificationsOpen] = useState(initialNotificationsOpen)
  const [localNotificationReadIds, setLocalNotificationReadIds] =
    useState<readonly string[]>(initialNotificationReadIds)
  const [localVariant, setLocalVariant] = useState<ClinicDashboardVariant>(variant)
  const storedFullInterface = useSyncExternalStore(
    subscribeToInterfaceMode,
    getStoredFullInterface,
    getServerFullInterface,
  )
  const activeVariant = persistInterfaceModeInSession
    ? storedFullInterface
      ? "visual-reference"
      : "presentation"
    : localVariant
  const storedNotificationReadState = useSyncExternalStore(
    subscribeToNotificationReadState,
    getStoredNotificationReadState,
    getServerNotificationReadState,
  )
  const notificationReadIds = persistInterfaceModeInSession
    ? getNotificationReadIds(storedNotificationReadState)
    : localNotificationReadIds
  const [patientProfileOpen, setPatientProfileOpen] = useState(initialDialog === "patient-profile")
  const [profileTaskOpen, setProfileTaskOpen] = useState(false)
  const [selectedProfileTask, setSelectedProfileTask] = useState<DashboardProfileTask>(
    clinicDashboardFixture.dashboard.profileTasks[0],
  )
  const [profileFocusTarget, setProfileFocusTarget] = useState<ClinicProfileDestination>()
  const [reviewsFocusRequested, setReviewsFocusRequested] = useState(false)
  const [teamMemberOpen, setTeamMemberOpen] = useState(initialDialog === "team-member")
  const [treatmentOpen, setTreatmentOpen] = useState(initialDialog === "treatment")
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>()
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>()
  const [savedProfile, setSavedProfile] = useState<ClinicProfileDraft>(() =>
    cloneClinicProfile(initialData.profile),
  )
  const [profileDraft, setProfileDraft] = useState<ClinicProfileDraft>(() =>
    cloneClinicProfile(initialData.profile),
  )
  const [reviews, setReviews] = useState<ClinicReview[]>(() =>
    initialData.reviews.items.map((review) => ({ ...review, internalNotes: [...review.internalNotes] })),
  )
  const [profileSaveState, setProfileSaveState] = useState<"idle" | "saved" | "saving">("idle")
  const [profileStatusMessage, setProfileStatusMessage] = useState("")
  const [profileUndo, setProfileUndo] = useState<ProfileUndo>()
  const patientTriggerRef = useRef<HTMLButtonElement>(null)
  const profileTaskTriggerRef = useRef<HTMLButtonElement>(null)
  const teamTriggerRef = useRef<HTMLButtonElement>(null)
  const treatmentTriggerRef = useRef<HTMLButtonElement>(null)
  const supportTriggerRef = useRef<HTMLButtonElement>(null)
  const profileDirty = useMemo(
    () => isClinicProfileDirty(savedProfile, profileDraft),
    [profileDraft, savedProfile],
  )
  const selectedTeamMember = profileDraft.team.find((member) => member.id === selectedTeamMemberId)
  const selectedTreatment = profileDraft.treatments.find((treatment) => treatment.id === selectedTreatmentId)

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 })
  }, [activeSection])

  const setShowFullInterface = (show: boolean) => {
    const nextVariant = show ? "visual-reference" : "presentation"
    if (!show) {
      setNotificationsOpen(false)
      if (selectedProfileTask.visibility === "full-interface") setProfileTaskOpen(false)
      setSupportOpen(false)
      setGalleryOpen(false)
      setSpecialtyOpen(false)
      setAddressOpen(false)
      setHoursOpen(false)
      setTeamMemberOpen(false)
      setTreatmentOpen(false)
    }
    if (persistInterfaceModeInSession) {
      window.sessionStorage.setItem(INTERFACE_MODE_SESSION_KEY, nextVariant)
      window.dispatchEvent(new Event(INTERFACE_MODE_CHANGE_EVENT))
      return
    }

    setLocalVariant(nextVariant)
  }

  const showDashboardReportingControls = activeSection === "dashboard" && activeVariant === "visual-reference"
  const notifications = clinicDashboardFixture.notifications

  const openProfileTask = (task: DashboardProfileTask, trigger: HTMLButtonElement) => {
    profileTaskTriggerRef.current = trigger
    setSelectedProfileTask(task)
    setProfileTaskOpen(true)
  }

  const navigateToProfileTarget = (destination: ClinicProfileDestination) => {
    setProfileTaskOpen(false)
    setProfileFocusTarget(destination)
    setActiveSection("profile")
  }

  const clearProfileFocusTarget = useCallback(() => setProfileFocusTarget(undefined), [])
  const clearReviewsFocusRequest = useCallback(() => setReviewsFocusRequested(false), [])

  const navigateToReviews = () => {
    setReviewsFocusRequested(true)
    setActiveSection("reviews")
  }

  const markAllNotificationsAsRead = () => {
    const nextReadIds = getAllNotificationReadIds(notifications, notificationReadIds)
    if (persistInterfaceModeInSession) {
      storeNotificationReadIds(nextReadIds)
      return
    }

    setLocalNotificationReadIds(nextReadIds)
  }

  const updateProfileDraft = (nextProfile: ClinicProfileDraft, message = "Unsaved profile changes") => {
    if (profileSaveState === "saving") return
    setProfileDraft(nextProfile)
    setProfileSaveState("idle")
    setProfileStatusMessage(message)
  }

  const cancelProfileChanges = () => {
    setProfileDraft(cloneClinicProfile(savedProfile))
    setProfileSaveState("idle")
    setProfileStatusMessage("Fixture profile changes discarded.")
    setProfileUndo(undefined)
  }

  const saveProfileChanges = async () => {
    if (!profileDirty) return
    setProfileSaveState("saving")
    setProfileStatusMessage("Saving fixture profile…")
    try {
      const saved = await dataSource.saveClinicProfile(cloneClinicProfile(profileDraft))
      setSavedProfile(cloneClinicProfile(saved))
      setProfileDraft(cloneClinicProfile(saved))
      setProfileSaveState("saved")
      setProfileStatusMessage(`Fixture profile saved as revision ${saved.revision}.`)
      setProfileUndo(undefined)
    } catch {
      setProfileSaveState("idle")
      setProfileStatusMessage("Profile changes could not be saved. Try again.")
    }
  }

  const saveTeamMember = (member: ClinicTeamMember) => {
    updateProfileDraft(
      {
        ...profileDraft,
        team: selectedTeamMemberId
          ? profileDraft.team.map((current) => (current.id === member.id ? member : current))
          : [...profileDraft.team, member],
      },
      selectedTeamMemberId ? "Team member changes staged." : "New team member staged.",
    )
    setSelectedTeamMemberId(undefined)
  }

  const saveTreatment = (treatment: ClinicTreatment) => {
    updateProfileDraft(
      {
        ...profileDraft,
        treatments: selectedTreatmentId
          ? profileDraft.treatments.map((current) => (current.id === treatment.id ? treatment : current))
          : [...profileDraft.treatments, treatment],
      },
      selectedTreatmentId ? "Treatment changes staged." : "New treatment staged.",
    )
    setSelectedTreatmentId(undefined)
  }

  const moveTreatment = (id: string, direction: -1 | 1) => {
    const currentIndex = profileDraft.treatments.findIndex((treatment) => treatment.id === id)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= profileDraft.treatments.length) return
    const treatments = [...profileDraft.treatments]
    const [treatment] = treatments.splice(currentIndex, 1)
    if (!treatment) return
    treatments.splice(nextIndex, 0, treatment)
    updateProfileDraft({ ...profileDraft, treatments }, "Treatment order staged.")
  }

  const removeTeamMember = (id: string) => {
    const index = profileDraft.team.findIndex((member) => member.id === id)
    const item = profileDraft.team[index]
    if (!item) return
    setProfileUndo({ index, item, kind: "team" })
    updateProfileDraft(
      { ...profileDraft, team: profileDraft.team.filter((member) => member.id !== id) },
      `${item.name} removed from the draft.`,
    )
  }

  const removeTreatment = (id: string) => {
    const index = profileDraft.treatments.findIndex((treatment) => treatment.id === id)
    const item = profileDraft.treatments[index]
    if (!item) return
    setProfileUndo({ index, item, kind: "treatment" })
    updateProfileDraft(
      { ...profileDraft, treatments: profileDraft.treatments.filter((treatment) => treatment.id !== id) },
      `${item.name} removed from the draft.`,
    )
  }

  const undoProfileRemoval = () => {
    if (!profileUndo) return
    if (profileUndo.kind === "team") {
      const team = [...profileDraft.team]
      team.splice(Math.min(profileUndo.index, team.length), 0, profileUndo.item)
      updateProfileDraft({ ...profileDraft, team }, `${profileUndo.item.name} restored.`)
    } else {
      const treatments = [...profileDraft.treatments]
      treatments.splice(Math.min(profileUndo.index, treatments.length), 0, profileUndo.item)
      updateProfileDraft({ ...profileDraft, treatments }, `${profileUndo.item.name} restored.`)
    }
    setProfileUndo(undefined)
  }

  const openSupport = (trigger: HTMLButtonElement) => {
    supportTriggerRef.current = trigger
    setSupportOpen(true)
  }

  return (
    <ClinicDashboardTemplate
      activeSection={activeSection}
      headerActions={
        showDashboardReportingControls ? (
          <DashboardPeriodControl onChange={setReportingPeriod} period={reportingPeriod} />
        ) : undefined
      }
      notificationOpen={notificationsOpen}
      notificationReadIds={notificationReadIds}
      notifications={notifications}
      onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
      onNavigate={setActiveSection}
      onNotificationOpenChange={setNotificationsOpen}
      onOpenSupport={openSupport}
      onShowFullInterfaceChange={setShowFullInterface}
      showFullInterface={activeVariant === "visual-reference"}
      showInterfaceModeToggle={showInterfaceModeToggle}
      variant={activeVariant}
    >
      {activeSection === "dashboard" ? (
        <DashboardOverview
          onNavigateToReviews={navigateToReviews}
          onOpenProfileTask={openProfileTask}
          period={reportingPeriod}
          variant={activeVariant}
        />
      ) : null}
      {activeSection === "messages" ? (
        <MessagesWorkspace onOpenPatientProfile={() => setPatientProfileOpen(true)} variant={activeVariant} />
      ) : null}
      {activeSection === "reviews" ? (
        <ReviewsManagement
          dataSource={dataSource}
          data={{ ...initialData.reviews, items: reviews }}
          focusHeading={reviewsFocusRequested}
          onFocusHandled={clearReviewsFocusRequest}
          onReviewChange={(nextReview) =>
            setReviews((current) =>
              current.map((review) => (review.id === nextReview.id ? nextReview : review)),
            )
          }
          variant={activeVariant}
        />
      ) : null}
      {activeSection === "profile" ? (
        <ClinicProfileEditor
          data={profileDraft}
          dirty={profileDirty}
          focusTarget={profileFocusTarget}
          onCancel={cancelProfileChanges}
          onChange={updateProfileDraft}
          onEditAddress={() => setAddressOpen(true)}
          onEditHours={() => setHoursOpen(true)}
          onEditTeamMember={(member) => {
            setSelectedTeamMemberId(member.id)
            setTeamMemberOpen(true)
          }}
          onEditTreatment={(treatment) => {
            setSelectedTreatmentId(treatment.id)
            setTreatmentOpen(true)
          }}
          onFocusTargetHandled={clearProfileFocusTarget}
          onMoveTreatment={moveTreatment}
          onOpenGallery={() => setGalleryOpen(true)}
          onOpenSpecialtyDialog={() => setSpecialtyOpen(true)}
          onOpenTeamDialog={() => {
            setSelectedTeamMemberId(undefined)
            setTeamMemberOpen(true)
          }}
          onOpenTreatmentDialog={() => {
            setSelectedTreatmentId(undefined)
            setTreatmentOpen(true)
          }}
          onRemoveTeamMember={removeTeamMember}
          onRemoveTreatment={removeTreatment}
          onSave={saveProfileChanges}
          onUndo={undoProfileRemoval}
          saveState={profileSaveState}
          statusMessage={profileStatusMessage}
          undoKind={profileUndo?.kind}
          undoMessage={profileUndo ? `${profileUndo.item.name} removed. Undo restores this item.` : undefined}
          variant={activeVariant}
        />
      ) : null}
      <PatientProfileDialog
        onOpenChange={setPatientProfileOpen}
        open={patientProfileOpen}
        triggerRef={patientTriggerRef}
        variant={activeVariant}
      />
      <ProfileTaskDialog
        onNavigate={navigateToProfileTarget}
        onOpenChange={setProfileTaskOpen}
        open={profileTaskOpen}
        task={selectedProfileTask}
        triggerRef={profileTaskTriggerRef}
      />
      {supportOpen ? (
        <SupportDialog
          dataSource={dataSource}
          onOpenChange={setSupportOpen}
          open
          triggerRef={supportTriggerRef}
        />
      ) : null}
      {treatmentOpen ? (
        <TreatmentDialog
          initialTreatment={selectedTreatment}
          onOpenChange={setTreatmentOpen}
          onSave={saveTreatment}
          open
          triggerRef={treatmentTriggerRef}
          variant={activeVariant}
        />
      ) : null}
      {teamMemberOpen ? (
        <TeamMemberDialog
          initialMember={selectedTeamMember}
          onOpenChange={setTeamMemberOpen}
          onSave={saveTeamMember}
          open
          triggerRef={teamTriggerRef}
          variant={activeVariant}
        />
      ) : null}
      {specialtyOpen ? (
        <SpecialtyDialog
          existing={profileDraft.specialties}
          onAdd={(specialty) =>
            updateProfileDraft(
              { ...profileDraft, specialties: [...profileDraft.specialties, specialty] },
              "Specialty staged.",
            )
          }
          onOpenChange={setSpecialtyOpen}
          open
        />
      ) : null}
      {galleryOpen ? (
        <GalleryDialog
          gallery={profileDraft.gallery}
          onOpenChange={setGalleryOpen}
          onSelectCover={(id) =>
            updateProfileDraft(
              {
                ...profileDraft,
                gallery: profileDraft.gallery.map((item) => ({ ...item, isCover: item.id === id })),
              },
              "Gallery cover staged.",
            )
          }
          open
        />
      ) : null}
      {addressOpen ? (
        <AddressDialog
          address={profileDraft.address}
          onOpenChange={setAddressOpen}
          onSave={(address) => updateProfileDraft({ ...profileDraft, address }, "Address changes staged.")}
          open
        />
      ) : null}
      {hoursOpen ? (
        <OpeningHoursDialog
          entries={profileDraft.openingHours}
          onOpenChange={setHoursOpen}
          onSave={(openingHours) =>
            updateProfileDraft({ ...profileDraft, openingHours }, "Opening-hour changes staged.")
          }
          open
        />
      ) : null}
    </ClinicDashboardTemplate>
  )
}
