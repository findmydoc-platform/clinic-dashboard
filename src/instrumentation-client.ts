import { initializeClinicHistoryDeparture } from "@/features/clinic-dashboard/workspace/browser/public"

// Next 16 initializes App Router history during hydration. Register the inert
// transport first; the authenticated lifetime supplies all later decisions.
initializeClinicHistoryDeparture()
