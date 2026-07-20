import lukasWeberAvatar from "@/assets/clinic-dashboard/lukas-weber.jpg"
import markusWeberAvatar from "@/assets/clinic-dashboard/markus-weber.jpg"
import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type { MessagesSnapshot, PatientInquiryProfile } from "../model/messages"

export const messagesFixture = {
  activeConversationId: "lukas-weber",
  conversations: [
    {
      avatar: lukasWeberAvatar,
      doctor: {
        id: "doctor-anna-keller",
        initials: "AK",
        name: "Dr Anna Keller",
        specialty: "Hair restoration",
      },
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
      doctor: {
        id: "doctor-anna-keller",
        initials: "AK",
        name: "Dr Anna Keller",
        specialty: "Hair restoration",
      },
      id: "markus-schmidt",
      initials: "MS",
      name: "Markus Schmidt",
      preview: "Thank you for the information. I will review…",
      section: "Recent chats",
      time: "Yesterday",
    },
    {
      avatar: sarahSchmidtAvatar,
      doctor: {
        id: "doctor-marie-vogel",
        initials: "MV",
        name: "Dr Marie Vogel",
        specialty: "Dermatology",
      },
      id: "sarah-meyer",
      initials: "SM",
      name: "Sarah Meyer",
      preview: "Thursday afternoon is my preferred contact window…",
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
      sender: "doctor",
      time: "10:52",
    },
    {
      attachment: {
        name: "assessment-photos.pdf",
        size: 720_000,
        type: "application/pdf",
      },
      body: "Here are the requested photos. I hope they help with the initial assessment.",
      id: "message-3",
      sender: "patient",
      time: "11:02",
    },
  ],
} satisfies MessagesSnapshot

export const patientInquiryFixture = {
  contactWindow: "Weekdays after 16:00",
  email: "l.weber@example.com",
  id: "inquiry-lukas-weber",
  interest: "Hair transplant",
  message: "I am interested in a hair transplant and would like to know which documents to prepare.",
  name: "Lukas Weber",
  phone: "+49 000 0000001",
  treatmentTimeline: "Within 3–6 months",
} satisfies PatientInquiryProfile
