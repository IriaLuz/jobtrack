import { useId, useRef, useState, type FormEvent } from "react";
import { isStatus, STATUS_LABELS, STATUSES, type JobApplicationInput } from "../../types/job";
import { Button } from "../button/button";

/** Same limit as the API (server/src/http/schemas.ts). */
const JOB_DESCRIPTION_MAX_LENGTH = 12_000;
/** Counted like the API's Zod `.max()`: after trimming, in Unicode code points (an emoji is 1, not 2). */
const countCharacters = (text: string) => [...text.trim()].length;
const formatCount = (count: number) => count.toLocaleString("en-GB");

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
 * The job description is the exception: maxLength would silently cut a long paste, so instead we
 * check its length as the user types, keep every character, show an error and block submitting.
 */
export const JobForm = ({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: JobFormProps) => {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionHintId = useId();
  const descriptionErrorId = useId();
  const [descriptionLength, setDescriptionLength] = useState(countCharacters(initialValues?.notes ?? ""));
  const isDescriptionTooLong = descriptionLength > JOB_DESCRIPTION_MAX_LENGTH;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDescriptionTooLong) {
      descriptionRef.current?.focus(); // the error is already on screen; take the user to the field
      return;
    }
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

      <div className="flex flex-col gap-1">
        <label>
          Job Description (optional)
          <textarea
            ref={descriptionRef}
            name="notes"
            rows={8}
            placeholder="Paste the full job description here to get interview questions tailored to this role."
            defaultValue={initialValues?.notes ?? ""}
            onChange={(event) => setDescriptionLength(countCharacters(event.currentTarget.value))}
            aria-invalid={isDescriptionTooLong}
            aria-describedby={isDescriptionTooLong ? `${descriptionHintId} ${descriptionErrorId}` : descriptionHintId}
          />
        </label>
        <p id={descriptionHintId} className="text-xs">
          Up to {formatCount(JOB_DESCRIPTION_MAX_LENGTH)} characters.
        </p>
        {isDescriptionTooLong && (
          <>
            {/* The alert's text never changes while it is shown, so it is announced once, not on every keystroke. */}
            <p id={descriptionErrorId} role="alert" className="text-sm text-(--danger)">
              Job description must be at most {formatCount(JOB_DESCRIPTION_MAX_LENGTH)} characters.
            </p>
            {/* The live count is outside the alert and not a live region, so it is visible but not announced. */}
            <p className="text-xs">Your description has {formatCount(descriptionLength)} characters.</p>
          </>
        )}
      </div>

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
