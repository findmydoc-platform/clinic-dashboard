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
      preview: "Thank you, the appointment time works for me.",
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
      attachmentSummary: "3 photos",
      body: "Thank you. I have attached the requested views for the initial assessment.",
      id: "istanbul-levent-message-3",
      sender: "patient",
      time: "09:56",
    },
  ],
} satisfies MessagesSnapshot

export const istanbulLeventPatientInquiry = {
  age: "34 years",
  avatar: personAAvatar,
  email: "eren.yilmaz@example.com",
  gender: "Male",
  interest: "Hair transplant",
  lastVisit: "July 19, 2026",
  medicalNotes:
    "The patient describes gradual hair thinning over three years. No treatment recommendation has been made; an initial consultation is pending.",
  name: "Eren Yılmaz",
} satisfies PatientInquiryProfile
