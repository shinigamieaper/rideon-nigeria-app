import { z } from "zod";

const Email = z.string().trim().email();
const Phone = z.string().trim().min(6);
const NonEmpty = z.string().trim().min(1);

const Payout = z
  .object({
    bankName: NonEmpty,
    accountNumber: z.string().trim().min(10).max(20),
    accountName: NonEmpty,
  })
  .strict();

const IndividualPartnerRegistrationSchema = z
  .object({
    partnerType: z.literal("individual"),
    firstName: NonEmpty,
    lastName: NonEmpty,
    email: Email,
    phoneNumber: Phone,
    businessName: NonEmpty,
    cacNumber: NonEmpty,
    bvnOrNin: NonEmpty,
    payout: Payout,
    kycConsent: z.literal(true),
  })
  .strict();

const BusinessPartnerRegistrationSchema = z
  .object({
    partnerType: z.literal("business"),
    firstName: NonEmpty,
    lastName: NonEmpty,
    email: Email,
    phoneNumber: Phone,
    businessName: NonEmpty,
    cacNumber: NonEmpty,
    directorName: NonEmpty,
    directorEmail: Email,
    directorPhone: Phone,
    payout: Payout,
    kycConsent: z.literal(true),
  })
  .strict();

export const PartnerRegistrationSchema = z.discriminatedUnion("partnerType", [
  IndividualPartnerRegistrationSchema,
  BusinessPartnerRegistrationSchema,
]);

export type PartnerRegistrationInput = z.infer<
  typeof PartnerRegistrationSchema
>;
