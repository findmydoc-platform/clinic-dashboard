"use client"

import type { ReactNode } from "react"
import type { EditorDepartureRequest } from "@/lib/editor-departure"
import { ClinicProfileTreatments } from "./components/organisms/ClinicProfileTreatments"
import { TreatmentDialog } from "./components/organisms/TreatmentDialog"
import { useClinicTreatmentsController } from "./hooks/useClinicTreatmentsController"
import type { ClinicProfileManagementAccess } from "./model/clinic-profile-management"
import type { ClinicTreatmentCommands } from "./model/clinic-treatment-commands"
import type { ClinicTreatmentsSnapshot } from "./model/clinic-treatment"

export function ClinicTreatmentsWorkspace({
  commands,
  snapshot,
  management,
  contextNavigation,
  onNavigationRequestChange,
  onSaved,
  onTreatmentMissing,
}: Readonly<{
  commands: ClinicTreatmentCommands
  snapshot: ClinicTreatmentsSnapshot
  management: ClinicProfileManagementAccess
  contextNavigation?: ReactNode
  onNavigationRequestChange?: (request: EditorDepartureRequest | null) => void
  onSaved?: (snapshot: ClinicTreatmentsSnapshot) => void
  onTreatmentMissing?: () => void
}>) {
  const { model, actions } = useClinicTreatmentsController({
    commands,
    initialSnapshot: snapshot,
    management,
    onSaved,
  })
  if (management === "hidden") return null
  return (
    <>
      <ClinicProfileTreatments
        isBusy={model.isBusy}
        onCreate={actions.openCreate}
        onRetry={() => void actions.reload()}
        onTreatmentOpen={actions.openOffering}
        showCreateAction={management === "interactive"}
        showTreatmentActions={management === "interactive"}
        showTreatmentViewAction={management === "read-only"}
        status={model.snapshot.status}
        statusMessage={model.statusMessage}
        treatments={model.snapshot.offerings}
      />
      {model.dialogOpen ? (
        <TreatmentDialog
          availableTreatments={model.availableTreatments}
          initialTreatment={model.selectedOffering}
          contextNavigation={contextNavigation}
          onNavigationRequestChange={onNavigationRequestChange}
          isBusy={model.isBusy}
          isReadOnly={management !== "interactive"}
          message={model.dialogMessage}
          onOpenChange={actions.setDialogOpen}
          onSave={(input) => actions.save(input, false)}
          onTreatmentMissing={onTreatmentMissing}
          open
        />
      ) : null}
    </>
  )
}
