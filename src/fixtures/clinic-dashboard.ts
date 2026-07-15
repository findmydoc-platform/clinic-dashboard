import type { ClinicDashboardSection } from "@/lib/clinic-dashboard/visibility"

export const navigationItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "messages", label: "Messages" },
  { id: "reviews", label: "Reviews" },
  { id: "profile", label: "Clinic profile" },
] as const satisfies ReadonlyArray<{ id: ClinicDashboardSection; label: string }>

export const clinicDashboardFixture = {
  admin: { initials: "AD", name: "Admin" },
  clinicName: "Berlin Health Clinic",
  dashboard: {
    chart: {
      labels: ["Oct 1", "Oct 10", "Oct 20", "Oct 30"],
      points: [18, 43, 61, 50, 22, 57, 92, 86, 49, 45, 83],
      summary: [
        { label: "Impressions", value: "18.4k" },
        { label: "Views", value: "3.2k" },
        { label: "Visitors", value: "2.1k" },
        { label: "Inquiries", value: "16" },
      ],
    },
    funnel: [
      { conversion: "17.8% CTR", label: "Impressions", value: "18,420" },
      { conversion: "64.1% visitors", label: "Profile views", value: "3,284" },
      { conversion: "1.3% conversion", label: "Visitors", value: "2,105" },
      { conversion: "38% inquiries", label: "Contacts", value: "42" },
      { label: "Inquiries", value: "16" },
    ],
    metrics: [
      { id: "completion", label: "Profile completion", progress: 82, value: "82%" },
      { delta: "+5.2%", id: "impressions", label: "Impressions", note: "Shown in search", value: "18,420" },
      { delta: "+12%", id: "views", label: "Profile views", note: "Opened pages", value: "3,284" },
      { delta: "-2.1%", id: "contacts", label: "Contacts", note: "Chat conversations", value: "42" },
      { delta: "+8.4%", id: "inquiries", label: "Inquiries", note: "Demo conversion", value: "16" },
    ],
    profileTasks: [
      { label: "Missing images", priority: "High" },
      { label: "Open doctor profiles", priority: "Medium" },
      { label: "Certificates required", priority: "High" },
      { label: "Certificate expiry", priority: "Low" },
    ],
    rating: {
      categories: ["Hair transplant", "Dental implants", "Laser eye surgery"],
      count: 124,
      value: 4.8,
    },
  },
  messages: {
    activeConversationId: "lukas-weber",
    conversations: [
      {
        id: "lukas-weber",
        initials: "LW",
        name: "Lukas Weber",
        preview: "Hello, I am interested in a hair transplant…",
        section: "New inquiries",
        time: "10:45",
        unread: 1,
      },
      {
        id: "markus-schmidt",
        initials: "MS",
        name: "Markus Schmidt",
        preview: "Thank you for the information. I will review…",
        section: "Recent chats",
        time: "Yesterday",
      },
      {
        id: "sarah-meyer",
        initials: "SM",
        name: "Sarah Meyer",
        preview: "Could we move the appointment to Thursday…",
        section: "Recent chats",
        time: "Mon",
      },
    ],
    dateLabel: "Today, October 12",
    interest: "Hair transplant",
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
        body: "Here are the requested photos. I hope they help with the initial assessment.",
        id: "message-3",
        sender: "patient",
        time: "11:02",
      },
    ],
    patientName: "Lukas Weber",
  },
  patient: {
    age: "32 years",
    email: "l.weber@example.com",
    gender: "Male",
    interest: "Hair transplant",
    lastVisit: "October 12, 2023",
    medicalNotes:
      "The patient reports hair loss around the crown for approximately two years. Initial consultation is pending.",
    name: "Lukas Weber",
  },
  profile: {
    address: { city: "Berlin", phone: "+49 30 12345678", postalCode: "10719", street: "Kurfürstendamm 212" },
    description:
      "Berlin Health Clinic is a specialist centre for aesthetic dentistry and dermatology. The clinic combines modern treatment methods with an international patient service.",
    name: "Berlin Health Dental & Derm Clinic",
    openingHours: [
      { days: "Mon – Fri", hours: "08:00 – 20:00" },
      { days: "Sat", hours: "09:00 – 14:00" },
      { days: "Sun", hours: "Closed" },
    ],
    specialties: ["Dentistry", "Dermatology"],
    team: [
      { initials: "MW", name: "Dr Markus Weber", specialty: "Orthodontics specialist" },
      { initials: "SS", name: "Dr Sarah Schmidt", specialty: "Dermatologist and laser specialist" },
    ],
    treatments: [
      { duration: "60 min", name: "Laser teeth whitening", price: "€250" },
      { duration: "90 min", name: "Ceramic veneers (per tooth)", price: "€850" },
      { duration: "45 min", name: "Skin analysis and treatment", price: "€120" },
    ],
  },
  reviews: {
    distribution: [
      { count: 1023, percent: 82, stars: 5 },
      { count: 150, percent: 12, stars: 4 },
      { count: 50, percent: 4, stars: 3 },
      { count: 18, percent: 1.5, stars: 2 },
      { count: 7, percent: 0.5, stars: 1 },
    ],
    items: [
      {
        author: "Markus Schmidt",
        body: "Excellent consultation and treatment. The team was professional from the first appointment and the early result looks great.",
        initials: "MS",
        rating: 5,
        response: "Thank you for your kind feedback. We are pleased that you are happy with the result.",
        status: "Answered",
        treatment: "Hair transplant",
      },
      {
        author: "Anonymous patient",
        body: "The treatment was good, but the waiting time was longer than expected and communication at reception could improve.",
        initials: "AP",
        rating: 3,
        status: "Open",
        treatment: "Dentistry",
      },
      {
        author: "Janine Doe",
        body: "This review is currently hidden while an appeal is assessed.",
        initials: "JD",
        notice:
          "Appeal submitted on October 14. A moderation response is expected within three to five working days.",
        rating: 1,
        status: "Under review",
        treatment: "Unknown",
      },
    ],
    rating: 4.8,
    total: 1248,
  },
} as const
