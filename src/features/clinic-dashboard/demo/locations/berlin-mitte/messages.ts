import lukasWeberAvatar from "../../assets/people/lukas-weber.jpg"
import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import sarahSchmidtAvatar from "../../assets/people/sarah-schmidt.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const berlinMitteMessages = {
  activeConversationId: "berlin-mitte-conversation-emil-wagner",
  conversations: [
    {
      avatar: lukasWeberAvatar,
      id: "berlin-mitte-conversation-emil-wagner",
      initials: "EW",
      name: "Emil Wagner",
      preview: "Which photos are useful before the first hair consultation?",
      section: "New inquiries",
      time: "09:42",
      treatment: { name: "Hair transplant" },
      unread: 1,
    },
    {
      avatar: sarahSchmidtAvatar,
      id: "berlin-mitte-conversation-nina-albrecht",
      initials: "NA",
      name: "Nina Albrecht",
      preview: "Thank you, the appointment time works for me.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: markusWeberAvatar,
      id: "berlin-mitte-conversation-paul-reuter",
      initials: "PR",
      name: "Paul Reuter",
      preview: "Could you confirm the expected consultation duration?",
      section: "Recent chats",
      time: "Fri",
      treatment: { name: "Laser teeth whitening" },
    },
  ],
  dateLabel: "Today, July 19",
  messages: [
    {
      body: "Hello, I am considering a hair transplant. Which photos are useful before the first consultation?",
      id: "berlin-mitte-message-1",
      sender: "patient",
      time: "09:42",
    },
    {
      body: "Hello Mr Wagner. Please send clear photos from the front, crown, and both sides in neutral daylight.",
      id: "berlin-mitte-message-2",
      read: "Read 09:49",
      sender: "clinic",
      time: "09:48",
    },
    {
      attachmentSummary: "3 photos",
      body: "Thank you. I have attached the requested views for the initial assessment.",
      id: "berlin-mitte-message-3",
      sender: "patient",
      time: "09:56",
    },
  ],
} satisfies MessagesSnapshot

export const berlinMittePatientInquiry = {
  age: "34 years",
  avatar: lukasWeberAvatar,
  email: "emil.wagner@example.com",
  gender: "Male",
  interest: "Hair transplant",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient describes gradual hair thinning over three years. No treatment recommendation has been made; an initial consultation is pending.",
  name: "Emil Wagner",
} satisfies PatientInquiryProfile
