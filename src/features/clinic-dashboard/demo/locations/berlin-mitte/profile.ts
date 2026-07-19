import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import sarahSchmidtAvatar from "../../assets/people/sarah-schmidt.jpg"
import corridorImage from "../../assets/locations/berlin-mitte/corridor.jpg"
import exteriorImage from "../../assets/locations/berlin-mitte/exterior.jpg"
import receptionImage from "../../assets/locations/berlin-mitte/reception.jpg"
import treatmentRoomImage from "../../assets/locations/berlin-mitte/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const berlinMitteProfile = {
  address: {
    city: "Berlin",
    phone: "+49 30 0000 1001",
    postalCode: "10117",
    street: "Friedrichstraße 100",
  },
  description:
    "Berlin Health Clinic — Mitte is the group’s established urban flagship for aesthetic medicine, dermatology, and coordinated international patient care.",
  gallery: [
    {
      alt: "Exterior of Berlin Health Clinic — Mitte",
      id: "berlin-mitte-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Berlin Health Clinic — Mitte",
      id: "berlin-mitte-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Berlin Health Clinic — Mitte",
      id: "berlin-mitte-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Corridor at Berlin Health Clinic — Mitte",
      id: "berlin-mitte-corridor",
      isCover: false,
      src: corridorImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-berlin-mitte",
  name: "Berlin Health Clinic — Mitte",
  openingHours: [
    { days: "Mon – Fri", hours: "08:00 – 20:00" },
    { days: "Sat", hours: "09:00 – 14:00" },
    { days: "Sun", hours: "Closed" },
  ],
  revision: 1,
  specialties: ["Aesthetic medicine", "Dermatology", "Hair restoration"],
  team: [
    {
      avatar: markusWeberAvatar,
      biography:
        "Specialist in restorative dentistry and structured treatment planning for international patients.",
      id: "berlin-mitte-team-jonas-keller",
      initials: "JK",
      name: "Dr Jonas Keller",
      specialty: "Restorative dentistry",
    },
    {
      avatar: sarahSchmidtAvatar,
      biography: "Dermatologist focused on laser treatments, skin health, and coordinated follow-up care.",
      id: "berlin-mitte-team-leonie-hartmann",
      initials: "LH",
      name: "Dr Leonie Hartmann",
      specialty: "Dermatology and laser medicine",
    },
  ],
  treatments: [
    { masterTreatmentId: "master-hair-transplant", price: "From €3,900" },
    { masterTreatmentId: "master-laser-teeth-whitening", price: "€250" },
    { masterTreatmentId: "master-skin-analysis", price: "€120" },
  ],
  updatedAt: "2026-07-19T08:30:00.000Z",
} satisfies ClinicProfileDraft
