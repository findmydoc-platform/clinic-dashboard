import "server-only"

import { z } from "zod"
import {
  clinicProfileCountry,
  clinicProfileSourceFieldLimits,
  clinicProfileSupportedLanguageValues,
  clinicProfileWeekdayValues,
} from "../model/clinic-profile-source"

const relationshipIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const citySchema = z
  .object({
    id: relationshipIdSchema,
    name: z.string().trim().min(1).max(clinicProfileSourceFieldLimits.cityNameLength),
  })
  .strict()
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
const sourceFieldsSchema = z
  .object({
    address: z
      .object({
        city: citySchema.optional(),
        country: z
          .object({
            code: z.literal(clinicProfileCountry.code),
            name: z.literal(clinicProfileCountry.name),
          })
          .strict(),
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
const publishedProfileSchema = sourceFieldsSchema
  .extend({
    revision: revisionSchema,
  })
  .superRefine((profile, context) => {
    if (!profile.openingHours) return

    for (const weekday of clinicProfileWeekdayValues) {
      const day = profile.openingHours[weekday]
      if (!day.isClosed && (day.opensAt === "" || day.closesAt === "" || day.closesAt <= day.opensAt)) {
        context.addIssue({
          code: "custom",
          message: "Published opening times must form a valid interval",
          path: ["openingHours", weekday],
        })
      }
    }
  })

export const clinicProfileSourceSnapshotSchema = z
  .object({
    availableCities: z.array(citySchema).max(5_000),
    draft: sourceFieldsSchema
      .extend({
        basePublishedRevision: revisionSchema,
        revision: revisionSchema,
      })
      .optional(),
    published: publishedProfileSchema,
  })
  .strict()
  .superRefine((snapshot, context) => {
    const availableCityIds = new Set(snapshot.availableCities.map((city) => city.id))
    if (availableCityIds.size !== snapshot.availableCities.length) {
      context.addIssue({
        code: "custom",
        message: "Available city ids must be unique",
        path: ["availableCities"],
      })
    }

    for (const [profileKey, profile] of [
      ["published", snapshot.published],
      ["draft", snapshot.draft],
    ] as const) {
      if (profile?.address.city && !availableCityIds.has(profile.address.city.id)) {
        context.addIssue({
          code: "custom",
          message: "Profile city must be an available Türkiye city",
          path: [profileKey, "address", "city"],
        })
      }
    }
  })

export const clinicProfileDraftSaveInputSchema = z
  .object({
    draft: draftInputSchema,
    expectedDraftRevision: revisionSchema.nullable(),
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
