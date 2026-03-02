import { z } from "zod";

const NonEmpty = z.string().trim().min(1);

export const PartnerDriverSubmissionSchema = z
  .object({
    partnerId: NonEmpty,

    firstName: NonEmpty,
    lastName: NonEmpty,
    phone: NonEmpty,
    email: z.string().trim().email().optional().default(""),

    city: NonEmpty,

    photoUrl: z.string().url().optional().default(""),

    documents: z
      .array(
        z.object({
          type: NonEmpty,
          url: z.string().url(),
        }),
      )
      .optional()
      .default([]),

    notes: z.string().trim().max(5000).optional().default(""),

    status: z
      .enum(["pending_review", "approved", "rejected", "changes_requested"])
      .optional()
      .default("pending_review"),
  })
  .strict();

export type PartnerDriverSubmissionInput = z.infer<
  typeof PartnerDriverSubmissionSchema
>;
