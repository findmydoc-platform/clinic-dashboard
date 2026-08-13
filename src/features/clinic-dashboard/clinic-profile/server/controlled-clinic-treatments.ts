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

const initialOfferings = (): ClinicTreatmentOffering[] => [
  {
    active: true,
    id: "controlled-offering-1",
    price: 250,
    revision: "2026-01-01T00:00:00.000Z",
    treatment: catalogue[0],
  },
]

const offeringsByClinic = new Map<string, ClinicTreatmentOffering[]>()

function offeringsForClinic(clinicId: string) {
  const current = offeringsByClinic.get(clinicId)
  if (current) return current
  const seeded = initialOfferings()
  offeringsByClinic.set(clinicId, seeded)
  return seeded
}

function nextRevision(previous?: string) {
  const previousTime = previous ? Date.parse(previous) : 0
  return new Date(Math.max(Date.now(), previousTime + 1)).toISOString()
}

export function resetControlledClinicTreatmentProviders() {
  offeringsByClinic.clear()
}

export function createControlledClinicTreatmentProvider(clinicId: string): ClinicTreatmentProvider {
  const snapshot = (): ClinicTreatmentsSnapshot => ({
    catalogue,
    offerings: offeringsForClinic(clinicId).map((offering) => ({
      ...offering,
      treatment: { ...offering.treatment },
    })),
    status: "ready",
  })

  return {
    async createTreatment(input) {
      const offerings = offeringsForClinic(clinicId)
      if (offerings.some((offering) => offering.treatment.id === input.treatmentId)) {
        return { error: "conflict", ok: false }
      }
      const treatment = catalogue.find((candidate) => candidate.id === input.treatmentId)
      if (!treatment) return { error: "invalid-input", ok: false }

      const offering = {
        active: false,
        id: `controlled-offering-${offerings.length + 1}`,
        price: input.price,
        revision: nextRevision(),
        treatment,
      }
      offeringsByClinic.set(clinicId, [...offerings, offering])
      return { ok: true, value: offering }
    },
    async loadTreatments() {
      return { ok: true, value: snapshot() }
    },
    async updateTreatment(offeringId, input) {
      const offerings = offeringsForClinic(clinicId)
      const existing = offerings.find((offering) => offering.id === offeringId)
      if (!existing) return { error: "not-found", ok: false }
      if (existing.revision !== input.expectedRevision) return { error: "conflict", ok: false }

      const offering = {
        ...existing,
        active: input.active,
        price: input.price,
        revision: nextRevision(existing.revision),
      }
      offeringsByClinic.set(
        clinicId,
        offerings.map((candidate) => (candidate.id === offeringId ? offering : candidate)),
      )
      return { ok: true, value: offering }
    },
  }
}
