import type { FormEvent } from "react";
import { isStatus, STATUS_LABELS, STATUSES, type JobApplicationInput } from "../../types/job";
import { Button } from "../button/button";

interface JobFormProps {
  initialValues?: JobApplicationInput;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (input: JobApplicationInput) => void;
  onCancel: () => void;
}

/**
 * Uncontrolled form: the browser keeps the field values and we read them once on submit.
 * The native constraints (required, maxLength, pattern) mirror the API's validation rules.
 */
export const JobForm = ({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: JobFormProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = (name: keyof JobApplicationInput) => String(formData.get(name) ?? "").trim();
    const status = formData.get("status");

    onSubmit({
      company: text("company"),
      role: text("role"),
      link: text("link"),
      status: isStatus(status) ? status : "saved",
      location: text("location") || null,
      salary: text("salary") || null,
      notes: text("notes") || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Company
          <input name="company" required maxLength={200} defaultValue={initialValues?.company} />
        </label>
        <label>
          Role
          <input name="role" required maxLength={200} defaultValue={initialValues?.role} />
        </label>
      </div>

      <label>
        Link to the job post
        <input
          name="link"
          type="url"
          required
          maxLength={2000}
          pattern="https?://.+"
          title="Start with http:// or https://"
          placeholder="https://"
          defaultValue={initialValues?.link}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          Status
          <select name="status" defaultValue={initialValues?.status ?? "saved"}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location (optional)
          <input name="location" maxLength={200} defaultValue={initialValues?.location ?? ""} />
        </label>
        <label>
          Salary (optional)
          <input name="salary" maxLength={100} defaultValue={initialValues?.salary ?? ""} />
        </label>
      </div>

      <label>
        Notes (optional)
        <textarea name="notes" rows={4} maxLength={2000} defaultValue={initialValues?.notes ?? ""} />
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm text-(--danger)">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
};
