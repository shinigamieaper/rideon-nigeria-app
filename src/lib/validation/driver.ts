import { z } from "zod";

const Email = z.string().trim().email();
const Phone = z.string().trim().min(6);
const NonEmpty = z.string().trim().min(1);

const Digits11 = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Must be 11 digits");
const OptionalDigits11 = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Must be 11 digits")
  .optional()
  .or(z.literal("").transform(() => undefined));

const ServedCities = z.array(z.string().trim().min(1)).max(16).optional();

const ShortStringArray = (maxItems = 12, maxLen = 40) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).optional();

const Reference = z
  .object({
    name: z.string().trim().min(1),
    email: Email,
    phone: Phone,
    relationship: z.string().trim().min(1),
  })
  .strict();

const FileUrl = z
  .string()
  .trim()
  .min(1)
  .refine(
    (s) => /^https?:\/\//i.test(s) || s.startsWith("/api/files/"),
    "Invalid URL",
  );

const OptionalUrl = FileUrl.optional().or(
  z.literal("").transform(() => undefined),
);

const DriverDocuments = z
  .object({
    driversLicenseUrl: FileUrl,
    governmentIdUrl: FileUrl,
    lasdriCardUrl: OptionalUrl,
    policeReportUrl: OptionalUrl,
    medicalReportUrl: OptionalUrl,
    eyeTestUrl: OptionalUrl,
  })
  .strict();

export const FleetRegistrationSchema = z
  .object({
    firstName: NonEmpty,
    lastName: NonEmpty,
    email: Email,
    phoneNumber: Phone,
    experienceYears: z.coerce.number().finite().min(0).max(80),
    profileImageUrl: z
      .string()
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    documents: DriverDocuments,
    servedCities: ServedCities,
    references: z.array(Reference).min(1).max(5),
    kycConsent: z.literal(true),
  })
  .strict();

export const PlacementApplicationSchema = z
  .object({
    firstName: NonEmpty,
    lastName: NonEmpty,
    email: Email,
    phoneNumber: Phone,
    nin: Digits11,
    bvn: OptionalDigits11,
    experienceYears: z.coerce.number().finite().min(0).max(80),
    profileImageUrl: z
      .string()
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    preferredCity: NonEmpty,
    salaryExpectation: z
      .preprocess(
        (v) => (v === "" || v === null || typeof v === "undefined" ? 0 : v),
        z.coerce.number().finite().nonnegative(),
      )
      .optional(),
    salaryExpectationMinNgn: z
      .preprocess(
        (v) => (v === "" || v === null || typeof v === "undefined" ? 0 : v),
        z.coerce.number().finite().nonnegative(),
      )
      .optional(),
    salaryExpectationMaxNgn: z
      .preprocess(
        (v) => (v === "" || v === null || typeof v === "undefined" ? 0 : v),
        z.coerce.number().finite().nonnegative(),
      )
      .optional(),
    vehicleTypesHandled: z.string().trim().max(200).optional(),
    vehicleExperience: z
      .object({
        categories: ShortStringArray(12, 40),
        notes: z.string().trim().max(300).optional(),
      })
      .optional(),
    familyFitTags: ShortStringArray(12, 50),
    familyFitNotes: z.string().trim().max(300).optional(),
    languages: ShortStringArray(12, 30),
    hobbies: ShortStringArray(12, 30),
    fullTimePreferences: z
      .object({
        willingToTravel: z.boolean().optional(),
        preferredClientType: z
          .enum(["personal", "corporate", "any"])
          .optional(),
      })
      .optional(),
    availabilityFullTime: z.boolean().optional(),
    additionalNotes: z.string().trim().max(2000).optional(),
    profileSummary: z.string().trim().max(2000).optional(),
    backgroundConsent: z.literal(true),
    documents: DriverDocuments,
    references: z.array(Reference).min(1).max(5),
    kycConsent: z.literal(true),
  })
  .superRefine((v, ctx) => {
    const min =
      typeof v.salaryExpectationMinNgn === "number"
        ? v.salaryExpectationMinNgn
        : 0;
    const max =
      typeof v.salaryExpectationMaxNgn === "number"
        ? v.salaryExpectationMaxNgn
        : 0;
    if (min > 0 && max > 0 && max < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryExpectationMaxNgn"],
        message: "Max salary must be greater than or equal to min salary.",
      });
    }
  })
  .strict();

export type FleetRegistrationInput = z.infer<typeof FleetRegistrationSchema>;
export type PlacementApplicationInput = z.infer<
  typeof PlacementApplicationSchema
>;
