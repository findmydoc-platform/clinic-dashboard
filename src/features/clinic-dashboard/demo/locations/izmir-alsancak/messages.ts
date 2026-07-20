import personAAvatar from "../../assets/people/person-a.jpg"
import personBAvatar from "../../assets/people/person-b.jpg"
import personCAvatar from "../../assets/people/person-c.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const izmirAlsancakMessages = {
  activeConversationId: "izmir-alsancak-conversation-leyla-demir",
  conversations: [
    {
      avatar: personCAvatar,
      doctor: {
        id: "izmir-alsancak-doctor-derya-aydin",
        initials: "DA",
        name: "Dr Derya Aydın",
        specialty: "Aesthetic dentistry",
      },
      id: "izmir-alsancak-conversation-leyla-demir",
      initials: "LD",
      name: "Leyla Demir",
      preview: "Can I combine the consultation with a whitening assessment?",
      section: "New inquiries",
      time: "09:18",
      treatment: { name: "Ceramic veneers" },
      unread: 2,
    },
    {
      avatar: personBAvatar,
      doctor: {
        id: "izmir-alsancak-doctor-kerem-yilmaz",
        initials: "KY",
        name: "Dr Kerem Yılmaz",
        specialty: "Dermatology",
      },
      id: "izmir-alsancak-conversation-deniz-koc",
      initials: "DK",
      name: "Deniz Koç",
      preview: "I have uploaded the requested information.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: personAAvatar,
      doctor: {
        id: "izmir-alsancak-doctor-derya-aydin",
        initials: "DA",
        name: "Dr Derya Aydın",
        specialty: "Aesthetic dentistry",
      },
      id: "izmir-alsancak-conversation-can-aydin",
      initials: "CA",
      name: "Can Aydın",
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
      id: "izmir-alsancak-message-1",
      sender: "patient",
      time: "09:18",
    },
    {
      body: "Hello Ms Demir. I can discuss both topics with you in one consultation, followed by a separate clinical assessment.",
      id: "izmir-alsancak-message-2",
      read: "Read 09:25",
      sender: "doctor",
      time: "09:24",
    },
    {
      body: "That sounds good. I would prefer an appointment after 16:00 next week.",
      id: "izmir-alsancak-message-3",
      sender: "patient",
      time: "09:31",
    },
  ],
} satisfies MessagesSnapshot

export const izmirAlsancakPatientInquiry = {
  age: "29 years",
  avatar: personCAvatar,
  email: "leyla.demir@example.com",
  gender: "Female",
  interest: "Ceramic veneers",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient requests an initial aesthetic dentistry consultation. Clinical suitability and treatment scope have not yet been assessed.",
  name: "Leyla Demir",
} satisfies PatientInquiryProfile
