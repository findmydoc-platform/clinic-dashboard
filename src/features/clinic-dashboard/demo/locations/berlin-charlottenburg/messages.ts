import lukasWeberAvatar from "../../assets/people/lukas-weber.jpg"
import markusWeberAvatar from "../../assets/people/markus-weber.jpg"
import sarahSchmidtAvatar from "../../assets/people/sarah-schmidt.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const berlinCharlottenburgMessages = {
  activeConversationId: "berlin-charlottenburg-conversation-lina-koenig",
  conversations: [
    {
      avatar: sarahSchmidtAvatar,
      id: "berlin-charlottenburg-conversation-lina-koenig",
      initials: "LK",
      name: "Lina König",
      preview: "Can I combine the consultation with a whitening assessment?",
      section: "New inquiries",
      time: "09:18",
      treatment: { name: "Ceramic veneers" },
      unread: 2,
    },
    {
      avatar: markusWeberAvatar,
      id: "berlin-charlottenburg-conversation-david-boehm",
      initials: "DB",
      name: "David Böhm",
      preview: "I have uploaded the requested information.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: lukasWeberAvatar,
      id: "berlin-charlottenburg-conversation-anton-seidel",
      initials: "AS",
      name: "Anton Seidel",
      preview: "Thursday afternoon would be ideal.",
      section: "Recent chats",
      time: "Thu",
      treatment: { name: "Laser teeth whitening" },
    },
  ],
  dateLabel: "Today, July 19",
  messages: [
    {
      body: "Hello, I would like advice about ceramic veneers. Can I combine the consultation with a whitening assessment?",
      id: "berlin-charlottenburg-message-1",
      sender: "patient",
      time: "09:18",
    },
    {
      body: "Hello Ms König. Both topics can be discussed in one consultation, followed by a separate clinical assessment.",
      id: "berlin-charlottenburg-message-2",
      read: "Read 09:25",
      sender: "clinic",
      time: "09:24",
    },
    {
      body: "That sounds good. I would prefer an appointment after 16:00 next week.",
      id: "berlin-charlottenburg-message-3",
      sender: "patient",
      time: "09:31",
    },
  ],
} satisfies MessagesSnapshot

export const berlinCharlottenburgPatientInquiry = {
  age: "29 years",
  avatar: sarahSchmidtAvatar,
  email: "lina.koenig@example.com",
  gender: "Female",
  interest: "Ceramic veneers",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient requests an initial aesthetic dentistry consultation. Clinical suitability and treatment scope have not yet been assessed.",
  name: "Lina König",
} satisfies PatientInquiryProfile
