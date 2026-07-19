import lukasWeberAvatar from "../../assets/people/lukas-weber.jpg"
import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import sarahSchmidtAvatar from "../../assets/people/sarah-schmidt.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const potsdamMessages = {
  activeConversationId: "potsdam-conversation-mila-neumann",
  conversations: [
    {
      avatar: sarahSchmidtAvatar,
      id: "potsdam-conversation-mila-neumann",
      initials: "MN",
      name: "Mila Neumann",
      preview: "Is a referral needed for the first skin consultation?",
      section: "New inquiries",
      time: "08:54",
      treatment: { name: "Dermatology consultation" },
      unread: 1,
    },
    {
      avatar: lukasWeberAvatar,
      id: "potsdam-conversation-theo-winter",
      initials: "TW",
      name: "Theo Winter",
      preview: "The Wednesday appointment works for me.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: markusWeberAvatar,
      id: "potsdam-conversation-ole-friedrich",
      initials: "OF",
      name: "Ole Friedrich",
      preview: "Thank you for explaining the next steps.",
      section: "Recent chats",
      time: "Wed",
      treatment: { name: "Dermatology consultation" },
    },
  ],
  dateLabel: "Today, July 19",
  messages: [
    {
      body: "Hello, is a referral needed for the first skin consultation at the Potsdam location?",
      id: "potsdam-message-1",
      sender: "patient",
      time: "08:54",
    },
    {
      body: "Hello Ms Neumann. A referral is not required for the initial private consultation in this demo scenario.",
      id: "potsdam-message-2",
      read: "Read 09:02",
      sender: "clinic",
      time: "09:01",
    },
    {
      body: "Thank you. I would like to request an appointment on a Wednesday morning.",
      id: "potsdam-message-3",
      sender: "patient",
      time: "09:07",
    },
  ],
} satisfies MessagesSnapshot

export const potsdamPatientInquiry = {
  age: "41 years",
  avatar: sarahSchmidtAvatar,
  email: "mila.neumann@example.com",
  gender: "Female",
  interest: "Dermatology consultation",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient requests a general skin consultation. No diagnosis is included in the demo data and the clinical assessment is pending.",
  name: "Mila Neumann",
} satisfies PatientInquiryProfile
