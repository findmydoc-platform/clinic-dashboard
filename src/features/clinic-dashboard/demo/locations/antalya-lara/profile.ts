import personBAvatar from "../../assets/people/person-b.jpg"
import consultationRoomImage from "../../assets/locations/antalya-lara/consultation-room.jpg"
import exteriorImage from "../../assets/locations/antalya-lara/exterior.jpg"
import receptionImage from "../../assets/locations/antalya-lara/reception.jpg"
import treatmentRoomImage from "../../assets/locations/antalya-lara/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const antalyaLaraProfile = {
  address: {
    city: "Antalya",
    phone: "+90 242 000 00 03",
    postalCode: "07160",
    street: "Lara Caddesi 000",
  },
  description:
    "Avenora Clinic — Antalya is the group’s newest, smaller location for dermatology, skin analysis, and preventive consultations in a bright local setting.",
  gallery: [
    {
      alt: "Exterior of Avenora Clinic — Antalya",
      id: "antalya-lara-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Avenora Clinic — Antalya",
      id: "antalya-lara-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Avenora Clinic — Antalya",
      id: "antalya-lara-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Consultation room at Avenora Clinic — Antalya",
      id: "antalya-lara-consultation-room",
      isCover: false,
      src: consultationRoomImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-antalya-lara",
  name: "Avenora Clinic — Antalya",
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
      avatar: personBAvatar,
      biography:
        "General dermatologist focused on early assessment, clear treatment plans, and continuity of care.",
      id: "antalya-lara-doctor-zeynep-arslan",
      initials: "ZA",
      name: "Dr Zeynep Arslan",
      specialty: "General dermatology",
    },
  ],
  updatedAt: "2026-07-19T08:10:00.000Z",
} satisfies ClinicProfileDraft
