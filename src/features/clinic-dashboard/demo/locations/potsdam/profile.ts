import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import consultationRoomImage from "../../assets/locations/potsdam/consultation-room.jpg"
import exteriorImage from "../../assets/locations/potsdam/exterior.jpg"
import receptionImage from "../../assets/locations/potsdam/reception.jpg"
import treatmentRoomImage from "../../assets/locations/potsdam/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const potsdamProfile = {
  address: {
    city: "Potsdam",
    phone: "+49 331 0000 1003",
    postalCode: "14467",
    street: "Brandenburger Straße 45",
  },
  description:
    "Berlin Health Clinic — Potsdam is the group’s newest, smaller location for dermatology, skin analysis, and preventive consultations in a bright local setting.",
  gallery: [
    {
      alt: "Exterior of Berlin Health Clinic — Potsdam",
      id: "potsdam-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Berlin Health Clinic — Potsdam",
      id: "potsdam-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Berlin Health Clinic — Potsdam",
      id: "potsdam-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Consultation room at Berlin Health Clinic — Potsdam",
      id: "potsdam-consultation-room",
      isCover: false,
      src: consultationRoomImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-potsdam",
  name: "Berlin Health Clinic — Potsdam",
  openingHours: [
    { days: "Mon – Tue", hours: "09:00 – 18:00" },
    { days: "Wed", hours: "10:00 – 20:00" },
    { days: "Thu – Fri", hours: "09:00 – 17:00" },
    { days: "Sat – Sun", hours: "Closed" },
  ],
  revision: 1,
  specialties: ["General dermatology", "Skin analysis", "Preventive consultations"],
  team: [
    {
      avatar: markusWeberAvatar,
      biography:
        "General dermatologist focused on early assessment, clear treatment plans, and continuity of care.",
      id: "potsdam-team-noah-richter",
      initials: "NR",
      name: "Dr Noah Richter",
      specialty: "General dermatology",
    },
  ],
  treatments: [
    { masterTreatmentId: "master-skin-analysis", price: "€95" },
    { masterTreatmentId: "master-dermatology-consultation", price: "€110" },
  ],
  updatedAt: "2026-07-19T08:10:00.000Z",
} satisfies ClinicProfileDraft
