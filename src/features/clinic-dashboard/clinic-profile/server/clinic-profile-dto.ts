import "server-only"

import { z } from "zod"
import {
  clinicProfileSourceFieldLimits,
  clinicProfileSupportedLanguageValues,
  clinicProfileWeekdayValues,
} from "../model/clinic-profile-source"

const relationshipIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/u)
const openingHoursDaySchema = z
  .object({
    closesAt: timeSchema,
    isClosed: z.boolean(),
    opensAt: timeSchema,
  })
  .strict()
const openingHoursSchema = z
  .object({
    friday: openingHoursDaySchema,
    monday: openingHoursDaySchema,
    saturday: openingHoursDaySchema,
    sunday: openingHoursDaySchema,
    thursday: openingHoursDaySchema,
    tuesday: openingHoursDaySchema,
    wednesday: openingHoursDaySchema,
  })
  .strict()
  .superRefine((openingHours, context) => {
    for (const weekday of clinicProfileWeekdayValues) {
      const day = openingHours[weekday]
      if (day.isClosed && (day.opensAt !== "" || day.closesAt !== "")) {
        context.addIssue({
          code: "custom",
          message: "Closed days must not contain times",
          path: [weekday],
        })
      }
    }
  })
const supportedLanguagesSchema = z
  .array(z.enum(clinicProfileSupportedLanguageValues))
  .max(clinicProfileSupportedLanguageValues.length)
  .refine((languages) => new Set(languages).size === languages.length)
const draftInputSchema = z
  .object({
    address: z
      .object({
        cityId: relationshipIdSchema.optional(),
        houseNumber: z.string().max(clinicProfileSourceFieldLimits.houseNumberLength),
        street: z.string().max(clinicProfileSourceFieldLimits.streetLength),
        zipCode: z.string().max(clinicProfileSourceFieldLimits.zipCodeLength),
      })
      .strict(),
    descriptionText: z.string().max(clinicProfileSourceFieldLimits.descriptionTextLength),
    name: z.string().max(clinicProfileSourceFieldLimits.nameLength),
    openingHours: openingHoursSchema.optional(),
    supportedLanguages: supportedLanguagesSchema,
  })
  .strict()
const revisionSchema = z.number().int().nonnegative()

export const clinicProfileDraftCreateInputSchema = z
  .object({
    expectedPublishedRevision: revisionSchema,
  })
  .strict()

export const clinicProfileDraftSaveInputSchema = z
  .object({
    draft: draftInputSchema,
    expectedDraftRevision: revisionSchema,
    expectedPublishedRevision: revisionSchema,
  })
  .strict()

export const clinicProfileDraftDiscardInputSchema = z
  .object({
    expectedDraftRevision: revisionSchema,
  })
  .strict()

export const clinicProfilePublishInputSchema = z
  .object({
    expectedDraftRevision: revisionSchema,
    expectedPublishedRevision: revisionSchema,
  })
  .strict()
