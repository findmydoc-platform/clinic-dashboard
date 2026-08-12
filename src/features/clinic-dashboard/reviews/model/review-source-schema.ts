import { z } from "zod"
import {
  reviewAppealReasons,
  reviewAppealStatuses,
  reviewPublicMeasures,
  reviewResponseStatuses,
  reviewWithdrawalStates,
} from "./review-source"

const idSchema = z.string().trim().min(1).max(128)
const timestampSchema = z.string().datetime({ offset: true })
const reviewTextSchema = z.string().trim().min(1).max(10_000)
const workflowTextSchema = z.string().trim().min(10).max(2_000)
const treatmentSchema = z.object({ id: idSchema, label: z.string().trim().min(1).max(200) }).strict()

const reviewResponseWorkflowSchema = z
  .object({
    id: idSchema,
    moderatedAt: timestampSchema.optional(),
    pending: z.object({ body: workflowTextSchema, submittedAt: timestampSchema }).strict().optional(),
    published: z.object({ approvedAt: timestampSchema, body: workflowTextSchema }).strict().optional(),
    status: z.enum(reviewResponseStatuses),
  })
  .strict()

const reviewAppealWorkflowSchema = z
  .object({
    createdAt: timestampSchema,
    decidedAt: timestampSchema.optional(),
    decisionReason: workflowTextSchema.optional(),
    details: workflowTextSchema,
    id: idSchema,
    reason: z.enum(reviewAppealReasons),
    status: z.enum(reviewAppealStatuses),
  })
  .strict()

export const clinicReviewRecordSchema = z
  .object({
    appeal: reviewAppealWorkflowSchema.optional(),
    author: z.string().trim().min(1).max(200),
    id: idSchema,
    initials: z.string().trim().min(1).max(4),
    publicMeasure: z.enum(reviewPublicMeasures),
    publicNotice: reviewTextSchema.optional(),
    publicText: reviewTextSchema.optional(),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    response: reviewResponseWorkflowSchema.optional(),
    reviewDate: timestampSchema,
    treatment: treatmentSchema,
    withdrawalState: z.enum(reviewWithdrawalStates),
    withdrawnAt: timestampSchema.optional(),
  })
  .strict()

const distributionEntrySchema = z
  .object({
    count: z.number().int().nonnegative(),
    percent: z.number().min(0).max(100),
    stars: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  })
  .strict()

export const reviewsSourceSnapshotSchema = z
  .object({
    page: z
      .object({
        items: z.array(clinicReviewRecordSchema).max(100),
        limit: z.number().int().min(1).max(100),
        page: z.number().int().positive(),
        pageCount: z.number().int().positive(),
        total: z.number().int().nonnegative(),
      })
      .strict(),
    referenceTime: timestampSchema,
    summary: z
      .object({
        distribution: z.array(distributionEntrySchema).length(5),
        rating: z.number().min(0).max(5),
        total: z.number().int().nonnegative(),
      })
      .strict(),
    treatments: z.array(treatmentSchema).max(1_000),
  })
  .strict()

const publicationHistoryEntrySchema = z
  .object({
    actorType: z.enum(["patient", "platform_staff", "system"]),
    id: idSchema,
    publicAuthorName: z.string().trim().min(1).max(200).optional(),
    publicMeasure: z.enum(reviewPublicMeasures),
    publicNotice: reviewTextSchema.optional(),
    publicText: reviewTextSchema.optional(),
    recordedAt: timestampSchema,
    reviewDate: timestampSchema,
    starRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    status: z.enum(["approved", "pending", "rejected"]),
    withdrawalSource: z.enum(["patient", "platform"]).optional(),
    withdrawalState: z.enum(reviewWithdrawalStates),
    withdrawnAt: timestampSchema.optional(),
  })
  .strict()

const responseHistoryEntrySchema = z
  .object({
    action: z.enum([
      "approved",
      "blocked",
      "pending_edited",
      "rejected",
      "revision_submitted",
      "seeded",
      "submitted",
    ]),
    actorType: z.enum(["clinic_staff", "platform_staff", "system"]),
    id: idSchema,
    pendingBody: workflowTextSchema.optional(),
    publishedBody: workflowTextSchema.optional(),
    recordedAt: timestampSchema,
    status: z.enum(reviewResponseStatuses),
  })
  .strict()

const appealHistoryEntrySchema = z
  .object({
    action: z.enum(["dismissed", "reviewed", "seeded", "submitted", "under_review", "upheld"]),
    actorType: z.enum(["clinic_staff", "platform_staff", "system"]),
    decidedAt: timestampSchema.optional(),
    decisionReason: workflowTextSchema.optional(),
    id: idSchema,
    recordedAt: timestampSchema,
    status: z.enum(reviewAppealStatuses),
  })
  .strict()

export const reviewHistorySnapshotSchema = z
  .object({
    appeal: z.array(appealHistoryEntrySchema).max(1_000),
    publication: z
      .object({
        entries: z.array(publicationHistoryEntrySchema).max(100),
        hasNextPage: z.boolean(),
        nextCursor: z.string().min(1).max(2_048).optional(),
      })
      .strict(),
    response: z.array(responseHistoryEntrySchema).max(1_000),
    reviewId: idSchema,
  })
  .strict()

export const reviewResponseSubmissionSchema = z.object({ body: workflowTextSchema }).strict()
export const reviewAppealSubmissionSchema = z
  .object({ details: workflowTextSchema, reason: z.enum(reviewAppealReasons) })
  .strict()
