import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobApplicationInput } from "../../types/job";
import { JobForm } from "./job-form";

const existingJob: JobApplicationInput = {
  company: "Acme",
  role: "Frontend Engineer",
  link: "https://acme.example/jobs/1",
  status: "interviewing",
  location: "London",
  salary: null,
  notes: "Second round on Friday",
};

function renderForm(props: Partial<Parameters<typeof JobForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <JobForm submitLabel="Add application" isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />,
  );
  return { onSubmit, user: userEvent.setup() };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Company"), "Acme");
  await user.type(screen.getByLabelText("Role"), "Frontend Engineer");
  await user.type(screen.getByLabelText("Link to the job post"), "https://acme.example/jobs/1");
}

async function pasteInto(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) {
  await user.click(field);
  await user.paste(text);
}

describe("JobForm", () => {
  it("submits trimmed values, with empty optional fields as null", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Company"), "  Acme  ");
    await user.type(screen.getByLabelText("Role"), "Frontend Engineer");
    await user.type(screen.getByLabelText("Link to the job post"), "https://acme.example/jobs/1");
    await user.selectOptions(screen.getByLabelText("Status"), "Applied");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).toHaveBeenCalledWith({
      company: "Acme",
      role: "Frontend Engineer",
      link: "https://acme.example/jobs/1",
      status: "applied",
      location: null,
      salary: null,
      notes: null,
    });
  });

  // Regression: the browser's maxLength={2000} silently cut pasted descriptions, so the AI never saw the rest.
  it("submits a pasted job description in full, without cutting it", async () => {
    const { onSubmit, user } = renderForm();
    const description = "d".repeat(12_000);

    await fillRequiredFields(user);
    await pasteInto(user, screen.getByLabelText("Job Description (optional)"), description);
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0].notes).toHaveLength(12_000);
  });

  it("labels the job description field and tells the user its limit", () => {
    renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    expect(description).toHaveAttribute(
      "placeholder",
      "Paste the full job description here to get interview questions tailored to this role.",
    );
    expect(description).toHaveAttribute("rows", "8");
    expect(description).not.toHaveAttribute("maxlength");
    expect(description).toHaveAccessibleDescription("Up to 12,000 characters.");
  });

  it("accepts a job description of exactly 12,000 characters", async () => {
    const { user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    await pasteInto(user, description, "d".repeat(12_000));

    expect(description).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("counts the job description after trimming, as the API does", async () => {
    const { user } = renderForm();

    await pasteInto(user, screen.getByLabelText("Job Description (optional)"), `  ${"d".repeat(12_000)}\n`);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("flags a 12,001-character job description at once, keeps every character and blocks saving", async () => {
    const { onSubmit, user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    await fillRequiredFields(user);
    await pasteInto(user, description, "d".repeat(12_001));

    // Before Save is clicked: the error is shown, announced and linked to the field.
    expect(screen.getByRole("alert")).toHaveTextContent(/^Job description must be at most 12,000 characters\.$/);
    expect(screen.getByText("Your description has 12,001 characters.")).toBeInTheDocument();
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAccessibleDescription(expect.stringContaining("at most 12,000 characters"));
    expect(description).toHaveValue("d".repeat(12_001));

    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(description).toHaveFocus();
    expect(description).toHaveValue("d".repeat(12_001));
  });

  // Screen readers re-announce an alert whenever its text changes, so the changing count stays out of it.
  it("keeps the alert's text stable while typing, with the live count outside it", async () => {
    const { user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    await pasteInto(user, description, "d".repeat(12_001));
    const alert = screen.getByRole("alert");
    await user.type(description, "dd");

    const count = screen.getByText("Your description has 12,003 characters.");
    expect(screen.getByRole("alert")).toBe(alert); // the same element: not removed and re-added
    expect(alert).toHaveTextContent(/^Job description must be at most 12,000 characters\.$/);
    expect(alert).not.toContainElement(count);
    expect(count).not.toHaveAttribute("role");
    expect(count).not.toHaveAttribute("aria-live");
    expect(description).toHaveAccessibleDescription(
      "Up to 12,000 characters. Job description must be at most 12,000 characters.",
    );
  });

  it("counts each newline inside the description as one character", async () => {
    const { user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    await pasteInto(user, description, `${"d".repeat(5_999)}\n\n${"d".repeat(5_999)}`); // 12,000
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.clear(description);
    await user.paste(`${"d".repeat(5_999)}\n\n\n${"d".repeat(5_999)}`); // 12,001
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("counts an emoji as one character, as the API does", async () => {
    const { user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");
    const emoji = "😀".repeat(12_000); // 12,000 code points, 24,000 UTF-16 units

    await pasteInto(user, description, emoji);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.type(description, "d");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Your description has 12,001 characters.")).toBeInTheDocument();
    expect(description).toHaveValue(`${emoji}d`);
  });

  it("clears the error and saves once the job description is back within the limit", async () => {
    const { onSubmit, user } = renderForm();
    const description = screen.getByLabelText("Job Description (optional)");

    await fillRequiredFields(user);
    await pasteInto(user, description, "d".repeat(12_001));
    await user.keyboard("{Backspace}");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit.mock.calls[0]?.[0].notes).toHaveLength(12_000);
  });

  it("flags an existing job description that is already over the limit when editing", () => {
    renderForm({
      initialValues: { ...existingJob, notes: "d".repeat(12_001) },
      submitLabel: "Save changes",
    });

    expect(screen.getByRole("alert")).toHaveTextContent("at most 12,000 characters");
  });

  it("does not submit until the required fields are filled in", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("starts from the existing values when editing, including notes saved before the rename", () => {
    renderForm({ initialValues: existingJob, submitLabel: "Save changes" });

    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Status")).toHaveValue("interviewing");
    expect(screen.getByLabelText("Job Description (optional)")).toHaveValue("Second round on Friday");
  });

  it("shows the server's error and a busy state while saving", () => {
    renderForm({ isSubmitting: true, errorMessage: "Link must be a valid http(s) URL" });

    expect(screen.getByRole("alert")).toHaveTextContent("Link must be a valid http(s) URL");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
