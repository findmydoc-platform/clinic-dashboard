import personBAvatar from "../../assets/people/person-b.jpg"
import personCAvatar from "../../assets/people/person-c.jpg"
import corridorImage from "../../assets/locations/istanbul-levent/corridor.jpg"
import exteriorImage from "../../assets/locations/istanbul-levent/exterior.jpg"
import receptionImage from "../../assets/locations/istanbul-levent/reception.jpg"
import treatmentRoomImage from "../../assets/locations/istanbul-levent/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const istanbulLeventProfile = {
  address: {
    city: "İstanbul",
    phone: "+90 212 000 00 01",
    postalCode: "34330",
    street: "Büyükdere Caddesi 000",
  },
  description:
    "Avenora Clinic — İstanbul is the group’s established flagship for hair restoration, dermatology, and coordinated international patient care.",
  gallery: [
    {
      alt: "Exterior of Avenora Clinic — İstanbul",
      id: "istanbul-levent-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Avenora Clinic — İstanbul",
      id: "istanbul-levent-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Avenora Clinic — İstanbul",
      id: "istanbul-levent-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Corridor at Avenora Clinic — İstanbul",
      id: "istanbul-levent-corridor",
      isCover: false,
      src: corridorImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-istanbul-levent",
  name: "Avenora Clinic — İstanbul",
  openingHours: [
    { days: "Mon – Fri", hours: "08:00 – 20:00" },
    { days: "Sat", hours: "09:00 – 14:00" },
    { days: "Sun", hours: "Closed" },
  ],
  revision: 1,
  specialties: ["Aesthetic medicine", "Dermatology", "Hair restoration"],
  team: [
    {
      avatar: personBAvatar,
      biography: "Hair restoration specialist focused on evidence-based planning and long-term follow-up.",
      id: "istanbul-levent-doctor-emre-kaya",
      initials: "EK",
      name: "Dr Emre Kaya",
      specialty: "Hair restoration",
    },
    {
      avatar: personCAvatar,
      biography: "Dermatologist focused on laser treatments, skin health, and coordinated follow-up care.",
      id: "istanbul-levent-doctor-elif-demir",
      initials: "ED",
      name: "Dr Elif Demir",
      specialty: "Dermatology and laser medicine",
    },
  ],
  treatments: [
    { masterTreatmentId: "master-hair-transplant", price: "From €3,900" },
    { masterTreatmentId: "master-dermatology-consultation", price: "€150" },
    { masterTreatmentId: "master-skin-analysis", price: "€120" },
  ],
  updatedAt: "2026-07-19T08:30:00.000Z",
} satisfies ClinicProfileDraft
