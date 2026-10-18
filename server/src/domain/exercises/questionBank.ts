import type { QuestionContext } from "./exercise.js";

type QuestionTemplate = (job: QuestionContext) => string;

/**
 * Hand-written questions used whenever the AI cannot write one. Personalised where it reads naturally.
 * Roles are phrased as "the <role> role", never "a <role>", which breaks for roles like "Engineer".
 */
const QUESTION_TEMPLATES: readonly QuestionTemplate[] = [
  ({ role, company }) =>
    `Why do you want the ${role} role at ${company}, and what would you focus on in your first 90 days?`,
  ({ role }) =>
    `Describe a project you are proud of that is relevant to the ${role} role. What was your contribution, and what would you do differently today?`,
  () =>
    "Tell me about a time you disagreed with a teammate about a technical decision. How did you resolve it, and what was the outcome?",
  () =>
    "Walk me through how you would investigate a production bug that only affects some users. What would you check first, and why?",
  ({ company }) =>
    `Requirements at ${company} may change often. How do you keep your work easy to change without over-engineering it?`,
  () =>
    "Explain a technical concept you know well to a non-technical colleague, as you would in a meeting with a product manager.",
  ({ role }) =>
    `In the ${role} role you will review other people's work. What does a good code review look like to you, and what feedback has changed how you work?`,
  () =>
    "Tell me about a time you had to deliver under a tight deadline. Which trade-offs did you make, and how did you communicate them?",
];

export function pickFallbackQuestion(job: QuestionContext): string {
  const template = QUESTION_TEMPLATES[Math.floor(Math.random() * QUESTION_TEMPLATES.length)];
  if (!template) throw new Error("The question bank is empty");
  return template(job);
}
