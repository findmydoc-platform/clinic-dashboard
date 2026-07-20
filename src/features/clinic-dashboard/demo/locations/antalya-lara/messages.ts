import personAAvatar from "../../assets/people/person-a.jpg"
import personBAvatar from "../../assets/people/person-b.jpg"
import personCAvatar from "../../assets/people/person-c.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const antalyaLaraMessages = {
  activeConversationId: "antalya-lara-conversation-ece-arslan",
  conversations: [
    {
      avatar: personCAvatar,
      doctor: {
        id: "antalya-lara-doctor-zeynep-arslan",
        initials: "ZA",
        name: "Dr Zeynep Arslan",
        specialty: "General dermatology",
      },
      id: "antalya-lara-conversation-ece-arslan",
      initials: "EA",
      name: "Ece Arslan",
      preview: "Is a referral needed for the first skin consultation?",
      section: "New inquiries",
      time: "08:54",
      treatment: { name: "Dermatology consultation" },
      unread: 1,
    },
    {
      avatar: personAAvatar,
      doctor: {
        id: "antalya-lara-doctor-zeynep-arslan",
        initials: "ZA",
        name: "Dr Zeynep Arslan",
        specialty: "General dermatology",
      },
      id: "antalya-lara-conversation-mert-kaya",
      initials: "MK",
      name: "Mert Kaya",
      preview: "The Wednesday appointment works for me.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: personBAvatar,
      doctor: {
        id: "antalya-lara-doctor-zeynep-arslan",
        initials: "ZA",
        name: "Dr Zeynep Arslan",
        specialty: "General dermatology",
      },
      id: "antalya-lara-conversation-selin-polat",
      initials: "SP",
      name: "Selin Polat",
      preview: "Thank you for explaining the next steps.",
      section: "Recent chats",
      time: "Wed",
      treatment: { name: "Dermatology consultation" },
    },
  ],
  dateLabel: "Today, July 19",
  messages: [
    {
      body: "Hello, is a referral needed for the first skin consultation at the Antalya location?",
      id: "antalya-lara-message-1",
      sender: "patient",
      time: "08:54",
    },
    {
      body: "Hello Ms Arslan. You do not need a referral for an initial private consultation with me.",
      id: "antalya-lara-message-2",
      read: "Read 09:02",
      sender: "doctor",
      time: "09:01",
    },
    {
      body: "Thank you. I would like to request an appointment on a Wednesday morning.",
      id: "antalya-lara-message-3",
      sender: "patient",
      time: "09:07",
    },
  ],
} satisfies MessagesSnapshot

export const antalyaLaraPatientInquiry = {
  age: "41 years",
  avatar: personCAvatar,
  email: "ece.arslan@example.com",
  gender: "Female",
  interest: "Dermatology consultation",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient requests a general skin consultation. No diagnosis is included in the demo data and the clinical assessment is pending.",
  name: "Ece Arslan",
} satisfies PatientInquiryProfile
