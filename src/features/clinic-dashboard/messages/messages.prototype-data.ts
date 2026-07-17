import lukasWeberAvatar from "@/assets/clinic-dashboard/lukas-weber.jpg"
import markusWeberAvatar from "@/assets/clinic-dashboard/markus-weber.jpg"
import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { MessagesData, PatientInquiryProfile } from "./model/messages"

export const messagesPrototypeData = {
  activeConversationId: "lukas-weber",
  conversations: [
    {
      avatar: lukasWeberAvatar,
      id: "lukas-weber",
      initials: "LW",
      name: "Lukas Weber",
      preview: "Hello, I am interested in a hair transplant…",
      section: "New inquiries",
      time: "10:45",
      treatment: { name: "Hair transplant" },
      unread: 1,
    },
    {
      avatar: markusWeberAvatar,
      id: "markus-schmidt",
      initials: "MS",
      name: "Markus Schmidt",
      preview: "Thank you for the information. I will review…",
      section: "Recent chats",
      time: "Yesterday",
    },
    {
      avatar: sarahSchmidtAvatar,
      id: "sarah-meyer",
      initials: "SM",
      name: "Sarah Meyer",
      preview: "Could we move the appointment to Thursday…",
      section: "Recent chats",
      time: "Mon",
    },
  ],
  dateLabel: "Today, October 12",
  messages: [
    {
      body: "Hello, I am interested in a hair transplant at your clinic. Which documents should I prepare for an initial consultation?",
      id: "message-1",
      sender: "patient",
      time: "10:45",
    },
    {
      body: "Hello Mr Weber, thank you for your interest. For an initial assessment we normally need photos of the affected areas.",
      id: "message-2",
      read: "Read 10:52",
      sender: "clinic",
      time: "10:52",
    },
    {
      attachmentSummary: "3 photos",
      body: "Here are the requested photos. I hope they help with the initial assessment.",
      id: "message-3",
      sender: "patient",
      time: "11:02",
    },
  ],
} satisfies MessagesData

export const patientInquiryPrototypeData = {
  avatar: lukasWeberAvatar,
  age: "32 years",
  email: "l.weber@example.com",
  gender: "Male",
  interest: "Hair transplant",
  lastVisit: "October 12, 2023",
  medicalNotes:
    "The patient reports hair loss around the crown for approximately two years. Initial consultation is pending.",
  name: "Lukas Weber",
} satisfies PatientInquiryProfile
