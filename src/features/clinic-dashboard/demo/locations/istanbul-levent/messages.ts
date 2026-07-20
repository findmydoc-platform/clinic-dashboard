import personAAvatar from "../../assets/people/person-a.jpg"
import personBAvatar from "../../assets/people/person-b.jpg"
import personCAvatar from "../../assets/people/person-c.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "@/features/clinic-dashboard/messages/public"

export const istanbulLeventMessages = {
  activeConversationId: "istanbul-levent-conversation-eren-yilmaz",
  conversations: [
    {
      avatar: personAAvatar,
      doctor: {
        id: "istanbul-levent-doctor-emre-kaya",
        initials: "EK",
        name: "Dr Emre Kaya",
        specialty: "Hair restoration",
      },
      id: "istanbul-levent-conversation-eren-yilmaz",
      initials: "EY",
      name: "Eren Yılmaz",
      preview: "Which photos are useful before the first hair consultation?",
      section: "New inquiries",
      time: "09:42",
      treatment: { name: "Hair transplant" },
      unread: 1,
    },
    {
      avatar: personCAvatar,
      doctor: {
        id: "istanbul-levent-doctor-elif-demir",
        initials: "ED",
        name: "Dr Elif Demir",
        specialty: "Dermatology and laser medicine",
      },
      id: "istanbul-levent-conversation-buse-aksoy",
      initials: "BA",
      name: "Buse Aksoy",
      preview: "Thank you, I understand the next steps.",
      section: "Recent chats",
      time: "Yesterday",
      treatment: { name: "Skin analysis and treatment" },
    },
    {
      avatar: personBAvatar,
      doctor: {
        id: "istanbul-levent-doctor-elif-demir",
        initials: "ED",
        name: "Dr Elif Demir",
        specialty: "Dermatology and laser medicine",
      },
      id: "istanbul-levent-conversation-murat-sahin",
      initials: "MŞ",
      name: "Murat Şahin",
      preview: "Could you confirm the expected consultation duration?",
      section: "Recent chats",
      time: "Fri",
      treatment: { name: "Dermatology consultation" },
    },
  ],
  dateLabel: "Today, July 19",
  messages: [
    {
      body: "Hello, I am considering a hair transplant. Which photos are useful before the first consultation?",
      id: "istanbul-levent-message-1",
      sender: "patient",
      time: "09:42",
    },
    {
      body: "Hello Mr Yılmaz. Please send clear photos from the front, crown, and both sides in neutral daylight so I can prepare for our consultation.",
      id: "istanbul-levent-message-2",
      read: "Read 09:49",
      sender: "doctor",
      time: "09:48",
    },
    {
      attachment: {
        name: "initial-assessment-photos.pdf",
        size: 842_000,
        type: "application/pdf",
      },
      body: "Thank you. I have attached the requested views for the initial assessment.",
      id: "istanbul-levent-message-3",
      sender: "patient",
      time: "09:56",
    },
  ],
} satisfies MessagesSnapshot

export const istanbulLeventPatientInquiry = {
  contactWindow: "Weekdays, 16:00–19:00",
  email: "eren.yilmaz@example.com",
  id: "istanbul-levent-inquiry-eren-yilmaz",
  interest: "Hair transplant",
  message:
    "I am considering a hair transplant and would like to understand which photos are useful before an initial consultation.",
  name: "Eren Yılmaz",
  phone: "+90 000 000 00 01",
  treatmentTimeline: "Within 3–6 months",
} satisfies PatientInquiryProfile
