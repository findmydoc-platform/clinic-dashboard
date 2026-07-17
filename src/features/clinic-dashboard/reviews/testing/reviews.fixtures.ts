import type { ReviewCommands } from "../model/review-commands"
import type { ClinicReview } from "../model/review"
import type { ReviewsData } from "../model/reviews-data"

export const reviewsFixture = {
  referenceTime: "2023-10-16T12:00:00.000Z",
  distribution: [
    { count: 1023, percent: 82, stars: 5 },
    { count: 150, percent: 12, stars: 4 },
    { count: 50, percent: 4, stars: 3 },
    { count: 18, percent: 1.5, stars: 2 },
    { count: 7, percent: 0.5, stars: 1 },
  ],
  items: [
    {
      age: "2 days ago",
      author: "Markus Schmidt",
      body: "Excellent consultation and treatment. The team was professional from the first appointment and the early result looks great.",
      createdAt: "2023-10-14T09:00:00.000Z",
      id: "review-markus-schmidt",
      initials: "MS",
      internalNotes: [],
      rating: 5,
      response: "Thank you for your kind feedback. We are pleased that you are happy with the result.",
      status: "Answered",
      treatment: "Hair transplant",
      revision: 2,
    },
    {
      age: "5 days ago",
      author: "Anonymous patient",
      body: "The treatment was good, but the waiting time was longer than expected and communication at reception could improve.",
      createdAt: "2023-10-11T14:30:00.000Z",
      id: "review-anonymous-dentistry",
      initials: "AP",
      internalNotes: [],
      rating: 3,
      status: "Open",
      treatment: "Dentistry",
      revision: 1,
    },
    {
      age: "1 week ago",
      author: "Janine Doe",
      body: "This review is currently hidden while an appeal is assessed.",
      createdAt: "2023-10-09T11:00:00.000Z",
      id: "review-janine-doe",
      initials: "JD",
      internalNotes: ["Appeal submitted by the clinic administrator."],
      notice:
        "Appeal submitted on October 14. A moderation response is expected within three to five working days.",
      rating: 1,
      status: "Under review",
      treatment: "Unknown",
      revision: 3,
    },
    {
      age: "2 weeks ago",
      author: "Elena Fischer",
      body: "The consultation was clear and the treatment plan was easy to understand.",
      createdAt: "2023-10-02T10:00:00.000Z",
      id: "review-elena-fischer",
      initials: "EF",
      internalNotes: [],
      rating: 4,
      response: "Thank you for the clear feedback about your consultation.",
      status: "Answered",
      treatment: "Dermatology",
      revision: 1,
    },
    {
      age: "3 weeks ago",
      author: "David Müller",
      body: "Friendly team, short waiting time, and a very professional appointment.",
      createdAt: "2023-09-25T08:30:00.000Z",
      id: "review-david-mueller",
      initials: "DM",
      internalNotes: [],
      rating: 5,
      response: "Thank you for sharing your experience with our team.",
      status: "Answered",
      treatment: "Dentistry",
      revision: 2,
    },
    {
      age: "2 months ago",
      author: "Anonymous patient",
      body: "The result was good, although appointment coordination took longer than expected.",
      createdAt: "2023-08-21T15:00:00.000Z",
      id: "review-anonymous-coordination",
      initials: "AP",
      internalNotes: [],
      notice:
        "Appeal submitted on September 1. A moderation response is expected within three to five working days.",
      rating: 3,
      status: "Under review",
      treatment: "Hair transplant",
      revision: 1,
    },
  ],
  rating: 4.8,
  total: 1248,
} satisfies ReviewsData

export const openReviewFixture = reviewsFixture.items.find(
  (review) => review.status === "Open",
) as ClinicReview
export const underReviewFixture = reviewsFixture.items.find(
  (review) => review.status === "Under review",
) as ClinicReview

export function createReviewCommandsFixture(latencyMs = 0): ReviewCommands {
  const resolve = async <Value>(value: Value) => {
    if (latencyMs > 0) await new Promise((done) => setTimeout(done, latencyMs))
    return value
  }

  return {
    saveReviewNote: async (review, note) =>
      resolve({
        ...review,
        internalNotes: [...review.internalNotes, note.trim()],
        revision: review.revision + 1,
      }),
    saveReviewResponse: async (review, response) =>
      resolve({
        ...review,
        response: response.trim(),
        revision: review.revision + 1,
        status: "Answered" as const,
      }),
    submitReviewAppeal: async (review, reason, detail) =>
      resolve({
        ...review,
        notice: `Appeal submitted. ${reason}: ${detail.trim()} A moderation response is expected within three to five working days.`,
        revision: review.revision + 1,
        status: "Under review" as const,
      }),
  }
}

export function createRetryReviewCommandsFixture(): ReviewCommands {
  const commands = createReviewCommandsFixture()
  let saveAttempts = 0

  return {
    ...commands,
    saveReviewResponse: async (...input) => {
      saveAttempts += 1
      if (saveAttempts === 1) throw new Error("Fixture rejection")
      return commands.saveReviewResponse(...input)
    },
  }
}
