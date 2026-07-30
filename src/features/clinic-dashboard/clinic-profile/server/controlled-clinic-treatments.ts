import "server-only"

import type { ClinicTreatmentOffering, ClinicTreatmentsSnapshot } from "../model/clinic-treatment"
import type { ClinicTreatmentProvider } from "./clinic-treatment-provider"

const catalogue = [
  {
    descriptionText: "A central treatment description used for controlled integration tests.",
    id: "controlled-treatment-1",
    name: "Controlled treatment",
  },
  {
    descriptionText: "Another central treatment available to assign to the clinic.",
    id: "controlled-treatment-2",
    name: "Available controlled treatment",
  },
] as const

export function createControlledClinicTreatmentProvider(): ClinicTreatmentProvider {
  let offerings: ClinicTreatmentOffering[] = [
    {
      active: true,
      id: "controlled-offering-1",
      price: 250,
      treatment: catalogue[0],
    },
  ]
  const snapshot = (): ClinicTreatmentsSnapshot => ({
    catalogue,
    offerings: offerings.map((offering) => ({ ...offering, treatment: { ...offering.treatment } })),
    status: "ready",
  })

  return {
    async createTreatment(input) {
      if (offerings.some((offering) => offering.treatment.id === input.treatmentId)) {
        return { error: "conflict", ok: false }
      }
      const treatment = catalogue.find((candidate) => candidate.id === input.treatmentId)
      if (!treatment) return { error: "invalid-input", ok: false }

      const offering = {
        active: input.active,
        id: `controlled-offering-${offerings.length + 1}`,
        price: input.price,
        treatment,
      }
      offerings = [...offerings, offering]
      return { ok: true, value: offering }
    },
    async loadTreatments() {
      return { ok: true, value: snapshot() }
    },
    async updateTreatment(offeringId, input) {
      const existing = offerings.find((offering) => offering.id === offeringId)
      if (!existing) return { error: "not-found", ok: false }

      const offering = { ...existing, ...input }
      offerings = offerings.map((candidate) => (candidate.id === offeringId ? offering : candidate))
      return { ok: true, value: offering }
    },
  }
}
