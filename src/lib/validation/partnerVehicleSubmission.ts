import { z } from "zod";

const NonEmpty = z.string().trim().min(1);

export const PartnerVehicleSubmissionSchema = z
  .object({
    partnerId: NonEmpty,
    city: NonEmpty,
    category: NonEmpty,
    make: NonEmpty,
    model: NonEmpty,
    seats: z.coerce.number().finite().int().min(1).max(80),
    images: z.array(z.string().url()).optional().default([]),
    documents: z
      .array(
        z.object({
          type: NonEmpty,
          url: z.string().url(),
        }),
      )
      .optional()
      .default([]),
    description: z.string().trim().max(5000).optional().default(""),
    specs: z.record(z.string(), z.any()).optional().default({}),

    partnerBaseDayRateNgn: z.coerce.number().finite().positive(),
    partnerBaseBlock4hRateNgn: z.coerce
      .number()
      .finite()
      .positive()
      .nullable()
      .optional(),

    status: z
      .enum(["pending_review", "approved", "rejected", "changes_requested"])
      .optional()
      .default("pending_review"),
  })
  .strict();

export type PartnerVehicleSubmissionInput = z.infer<
  typeof PartnerVehicleSubmissionSchema
>;
