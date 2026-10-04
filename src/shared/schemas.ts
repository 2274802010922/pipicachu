import { z } from "zod";
export const analysisSchema = z
  .object({
    input: z.string().min(1).max(2048),
    network: z.enum(["mainnet", "devnet"]).default("mainnet"),
    focus: z.string().max(100).optional(),
  })
  .strict();
export const explainSchema = analysisSchema.extend({
  locale: z.enum(["vi", "en"]),
});
export const compareSchema = analysisSchema.extend({
  expected: z
    .object({
      network: z.enum(["mainnet", "devnet"]),
      recipient: z.string().min(1).max(100),
      asset: z.enum(["SOL", "USDC"]),
      amount: z.string().min(1).max(50),
    })
    .strict(),
});
