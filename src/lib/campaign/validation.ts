/**
 * What a campaign and a brief have to contain before they can move.
 *
 * The messages are written for the operator, not for a developer. "Required"
 * tells someone nothing; saying what the field is for tells them what to write.
 */

import { z } from "zod";

import { pillarEnum } from "@/db/schema";

export const newCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give the campaign a title you would recognise in a list next month."),
  pillar: z.enum(pillarEnum.enumValues, {
    message: "Pick which of the four messaging pillars this campaign carries.",
  }),
  objective: z
    .string()
    .trim()
    .min(
      20,
      "Write one sentence about what a person does or understands differently afterwards. A number is a result, not an objective.",
    ),
  audienceId: z.string().trim().min(1).optional(),
  signalId: z.string().trim().min(1).optional(),
});

export type NewCampaignInput = z.infer<typeof newCampaignSchema>;

const pathOnOurSite = z
  .string()
  .trim()
  .min(1, "Say where the call to action sends people, for example /download.")
  .refine((v) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(v), {
    message:
      "Give a path on our own site, such as /download, not a full URL. The link is tagged for you, and a full URL could quietly point somewhere else.",
  })
  .transform((v) => (v.startsWith("/") ? v : `/${v}`));

export const briefSchema = z.object({
  problem: z
    .string()
    .trim()
    .min(
      20,
      "Describe the moment that goes wrong for this person, in their words, not ours.",
    ),
  desiredOutcome: z
    .string()
    .trim()
    .min(20, "Describe what it looks like when the problem is gone."),
  promise: z
    .string()
    .trim()
    .min(10, "One sentence: what does VoxClip promise this person."),
  proof: z
    .string()
    .trim()
    .min(
      20,
      "What makes the promise believable. Name the real screenshot or recording you will show, or the verified fact you will point at.",
    ),
  offer: z
    .string()
    .trim()
    .min(5, "What are you asking them to take. Free download, the trial, an article."),
  primaryCta: z
    .string()
    .trim()
    .min(3, "One call to action, written as the words on the button."),
  ctaPath: pathOnOurSite,
  productContext: z.string().trim().optional(),
});

export type BriefInput = z.infer<typeof briefSchema>;

/**
 * One message per field, keyed by field name, so a form can show each error
 * next to the input it belongs to instead of dumping a list at the top.
 */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
