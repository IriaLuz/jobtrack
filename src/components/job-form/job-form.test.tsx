import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobApplicationInput } from "../../types/job";
import { JobForm } from "./job-form";

function renderForm(props: Partial<Parameters<typeof JobForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <JobForm submitLabel="Add application" isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />,
  );
  return { onSubmit, user: userEvent.setup() };
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

  it("does not submit until the required fields are filled in", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("starts from the existing values when editing", () => {
    const initialValues: JobApplicationInput = {
      company: "Acme",
      role: "Frontend Engineer",
      link: "https://acme.example/jobs/1",
      status: "interviewing",
      location: "London",
      salary: null,
      notes: "Second round on Friday",
    };

    renderForm({ initialValues, submitLabel: "Save changes" });

    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Status")).toHaveValue("interviewing");
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("Second round on Friday");
  });

  it("shows the server's error and a busy state while saving", () => {
    renderForm({ isSubmitting: true, errorMessage: "Link must be a valid http(s) URL" });

    expect(screen.getByRole("alert")).toHaveTextContent("Link must be a valid http(s) URL");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
