import personBAvatar from "../../assets/people/person-b.jpg"
import personCAvatar from "../../assets/people/person-c.jpg"
import corridorImage from "../../assets/locations/izmir-alsancak/corridor.jpg"
import exteriorImage from "../../assets/locations/izmir-alsancak/exterior.jpg"
import receptionImage from "../../assets/locations/izmir-alsancak/reception.jpg"
import treatmentRoomImage from "../../assets/locations/izmir-alsancak/treatment-room.jpg"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"

export const izmirAlsancakProfile = {
  address: {
    city: "İzmir",
    phone: "+90 232 000 00 02",
    postalCode: "35220",
    street: "Cumhuriyet Bulvarı 000",
  },
  description:
    "Avenora Clinic — İzmir combines aesthetic dentistry and dermatology with a strong focus on personal consultation and coordinated aftercare.",
  gallery: [
    {
      alt: "Exterior of Avenora Clinic — İzmir",
      id: "izmir-alsancak-exterior",
      isCover: true,
      src: exteriorImage,
    },
    {
      alt: "Reception at Avenora Clinic — İzmir",
      id: "izmir-alsancak-reception",
      isCover: false,
      src: receptionImage,
    },
    {
      alt: "Treatment room at Avenora Clinic — İzmir",
      id: "izmir-alsancak-treatment-room",
      isCover: false,
      src: treatmentRoomImage,
    },
    {
      alt: "Corridor at Avenora Clinic — İzmir",
      id: "izmir-alsancak-corridor",
      isCover: false,
      src: corridorImage,
    },
  ],
  galleryTotal: 4,
  id: "clinic-izmir-alsancak",
  name: "Avenora Clinic — İzmir",
  openingHours: [
    { days: "Mon – Thu", hours: "08:30 – 19:00" },
    { days: "Fri", hours: "08:30 – 17:00" },
    { days: "Sat – Sun", hours: "Closed" },
  ],
  revision: 1,
  specialties: ["Aesthetic dentistry", "Dermatology", "Preventive care"],
  team: [
    {
      avatar: personCAvatar,
      biography: "Aesthetic dentistry specialist focused on conservative planning and natural results.",
      id: "izmir-alsancak-doctor-derya-aydin",
      initials: "DA",
      name: "Dr Derya Aydın",
      specialty: "Aesthetic dentistry",
    },
    {
      avatar: personBAvatar,
      biography: "Dermatologist supporting preventive consultations and long-term treatment coordination.",
      id: "izmir-alsancak-doctor-kerem-yilmaz",
      initials: "KY",
      name: "Dr Kerem Yılmaz",
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
