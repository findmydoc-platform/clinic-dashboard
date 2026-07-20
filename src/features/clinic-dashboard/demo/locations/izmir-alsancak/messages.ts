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
      preview: "Thursday afternoon is my preferred contact window.",
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
      body: "That sounds good. I would prefer to be contacted after 16:00 next week.",
      id: "izmir-alsancak-message-3",
      sender: "patient",
      time: "09:31",
    },
  ],
} satisfies MessagesSnapshot

export const izmirAlsancakPatientInquiry = {
  contactWindow: "Weekdays after 16:00",
  email: "leyla.demir@example.com",
  id: "izmir-alsancak-inquiry-leyla-demir",
  interest: "Ceramic veneers",
  message:
    "I would like advice about ceramic veneers and whether a whitening assessment can be discussed at the same consultation.",
  name: "Leyla Demir",
  phone: "+90 000 000 00 02",
  treatmentTimeline: "Within 1–3 months",
} satisfies PatientInquiryProfile
