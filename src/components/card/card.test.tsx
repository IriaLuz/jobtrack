import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobApplication } from "../../types/job";
import { Card } from "./card";

const job: JobApplication = {
  id: "job-1",
  company: "Acme",
  role: "Frontend Engineer",
  status: "saved",
  link: "https://acme.example/jobs/1",
  salary: "£50,000",
  location: "London",
  notes: null,
};

describe("Card", () => {
  it("shows the company, role, location and salary", () => {
    render(<Card job={job} onEdit={vi.fn()} onPractise={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("London · £50,000")).toBeInTheDocument();
  });

  it("leaves out details that are missing", () => {
    render(<Card job={{ ...job, salary: null, location: null }} onEdit={vi.fn()} onPractise={vi.fn()} />);

    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("opens the job post in a new tab without giving it access to this page", () => {
    render(<Card job={job} onEdit={vi.fn()} onPractise={vi.fn()} />);

    const link = screen.getByRole("link", { name: /job post for frontend engineer at acme/i });

    expect(link).toHaveAttribute("href", job.link);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls the right callback for each action", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onPractise = vi.fn();
    render(<Card job={job} onEdit={onEdit} onPractise={onPractise} />);

    await user.click(screen.getByRole("button", { name: "Edit Frontend Engineer at Acme" }));
    await user.click(screen.getByRole("button", { name: "Practise for Frontend Engineer at Acme" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onPractise).toHaveBeenCalledOnce();
  });
});
