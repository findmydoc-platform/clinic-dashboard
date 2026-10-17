"use client"

import { useEffect } from "react"
import { ClinicGalleryManagerDialog } from "./components/organisms/ClinicGalleryManagerDialog"
import { ClinicProfileGallery } from "./components/organisms/ClinicProfileGallery"
import { useClinicGalleryController } from "./hooks/useClinicGalleryController"
import type { ClinicGalleryCommands } from "./model/clinic-gallery-commands"
import type { ClinicGalleryLoadStatus, ClinicGallerySnapshot } from "./model/clinic-gallery"
import type { ClinicProfileManagementAccess } from "./model/clinic-profile-management"

type DepartureRequest = (continueNavigation?: () => void, cancelNavigation?: () => void) => void

/** Gallery access does not activate the other profile domains. */
export function ClinicGalleryWorkspace({
  commands,
  management,
  snapshot,
  status,
  onSaved,
  onNavigationRequestChange,
  onContextNavigationRequestChange,
}: Readonly<{
  commands: ClinicGalleryCommands
  management: ClinicProfileManagementAccess
  snapshot?: ClinicGallerySnapshot
  status: ClinicGalleryLoadStatus
  onSaved: (snapshot: ClinicGallerySnapshot) => void
  onNavigationRequestChange: (request: DepartureRequest | undefined) => void
  onContextNavigationRequestChange: (request: DepartureRequest | null) => void
}>) {
  const controller = useClinicGalleryController({ commands, initialSnapshot: snapshot, management, onSaved })
  const requestNavigation = controller.actions.requestNavigation
  const open = controller.model.open
  useEffect(() => {
    onNavigationRequestChange(open ? requestNavigation : undefined)
    onContextNavigationRequestChange(open ? requestNavigation : null)
    return () => {
      onNavigationRequestChange(undefined)
      onContextNavigationRequestChange(null)
    }
  }, [onContextNavigationRequestChange, onNavigationRequestChange, open, requestNavigation])
  const published = controller.model.snapshot?.items.filter((item) => item.status === "published") ?? []
  return (
    <>
      {!open ? (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Clinic gallery</h1>
          <ClinicProfileGallery
            gallery={published.slice(0, 5).map((item, index) => ({
              id: item.id,
              alt: item.alt,
              src: item.thumbnailUrl ?? item.url,
              isCover: index === 0,
            }))}
            galleryTotal={published.length}
            onOpen={controller.actions.openGallery}
            status={controller.model.snapshot ? "ready" : status}
            showAction={management !== "hidden"}
          />
        </div>
      ) : null}
      <ClinicGalleryManagerDialog controller={controller} />
    </>
  )
}
