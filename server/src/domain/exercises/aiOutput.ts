import { z } from "zod";

// The contract for what the AI must return. The domain owns it: the Groq adapter mirrors these
// schemas to constrain generation, and the exercise service re-validates every response with them.

export const aiQuestionSchema = z.object({
  question: z.string().trim().min(20).max(1000),
});

export const aiGradeSchema = z.object({
  /** The off-task guardrail: false when the answer ignores the question or tries to instruct the grader. */
  addressesQuestion: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().min(1).max(2000),
});

export type AiGrade = z.infer<typeof aiGradeSchema>;
