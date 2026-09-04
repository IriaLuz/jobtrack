import type { JobApplication } from "../types/job";

export const mockJobs: JobApplication[] = [
  {
    id: crypto.randomUUID(),
    company: "Acme Technologies",
    role: "Frontend Developer",
    status: "saved",
    link: "https://example.com/jobs/frontend-developer",
    salary: "£45,000–£55,000",
    location: "London, UK",
    notes: "Strong match for React and TypeScript experience.",
  },
  {
    id: crypto.randomUUID(),
    company: "Northstar Digital Solutions International",
    role: "Full-Stack Engineer",
    status: "applied",
    link: "https://example.com/jobs/full-stack-engineer",
    salary: "£55,000–£65,000",
    location: "Remote",
    notes:
      "Longer company name to stress-test card layout and wrapping behaviour across different viewport sizes.",
  },
  {
    id: crypto.randomUUID(),
    company: "Bright Labs",
    role: "Product Engineer",
    status: "interviewing",
    link: "https://example.com/jobs/product-engineer",
    notes:
      "First interview completed. Follow-up discussion will cover system design, testing strategy, accessibility, and collaboration with product and design teams.",
  },
  {
    id: crypto.randomUUID(),
    company: "Greenfield Analytics",
    role: "Software Engineer",
    status: "offered",
    link: "https://example.com/jobs/software-engineer",
    salary: "£60,000–£70,000",
    location: "Bristol, UK",
  },
];
