import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import sarahSchmidtAvatar from "../../assets/people/sarah-schmidt.jpg"
import corridorImage from "../../assets/locations/berlin-charlottenburg/corridor.jpg"
import exteriorImage from "../../assets/locations/berlin-charlottenburg/exterior.jpg"
import receptionImage from "../../assets/locations/berlin-charlottenburg/reception.jpg"
import treatmentRoomImage from "../../assets/locations/berlin-charlottenburg/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const berlinCharlottenburgProfile = {
  address: {
    city: "Berlin",
    phone: "+49 30 0000 1002",
    postalCode: "10719",
    street: "Kurfürstendamm 212",
  },
  description:
    "Berlin Health Clinic — Charlottenburg combines aesthetic dentistry and dermatology in a calm historic setting with a strong focus on personal consultation.",
  gallery: [
    {
      alt: "Exterior of Berlin Health Clinic — Charlottenburg",
      id: "berlin-charlottenburg-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Berlin Health Clinic — Charlottenburg",
      id: "berlin-charlottenburg-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Berlin Health Clinic — Charlottenburg",
      id: "berlin-charlottenburg-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Corridor at Berlin Health Clinic — Charlottenburg",
      id: "berlin-charlottenburg-corridor",
      isCover: false,
      src: corridorImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-berlin-charlottenburg",
  name: "Berlin Health Clinic — Charlottenburg",
  openingHours: [
    { days: "Mon – Thu", hours: "08:30 – 19:00" },
    { days: "Fri", hours: "08:30 – 17:00" },
    { days: "Sat – Sun", hours: "Closed" },
  ],
  revision: 1,
  specialties: ["Aesthetic dentistry", "Dermatology", "Preventive care"],
  team: [
    {
      avatar: sarahSchmidtAvatar,
      biography:
        "Specialist in aesthetic dentistry with an emphasis on conservative, evidence-based treatment plans.",
      id: "berlin-charlottenburg-team-mara-vogel",
      initials: "MV",
      name: "Dr Mara Vogel",
      specialty: "Aesthetic dentistry",
    },
    {
      avatar: markusWeberAvatar,
      biography: "Dermatologist supporting preventive consultations and long-term treatment coordination.",
      id: "berlin-charlottenburg-team-felix-brandt",
      initials: "FB",
      name: "Dr Felix Brandt",
      specialty: "Dermatology",
    },
  ],
  treatments: [
    { masterTreatmentId: "master-ceramic-veneers", price: "From €890 per tooth" },
    { masterTreatmentId: "master-laser-teeth-whitening", price: "€280" },
    { masterTreatmentId: "master-skin-analysis", price: "€140" },
  ],
  updatedAt: "2026-07-19T08:20:00.000Z",
} satisfies ClinicProfileDraft
