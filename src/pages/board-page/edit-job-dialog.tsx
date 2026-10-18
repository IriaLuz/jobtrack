import { Button } from "../../components/button/button";
import { Dialog } from "../../components/dialog/dialog";
import { JobForm } from "../../components/job-form/job-form";
import { useDeleteJob, useUpdateJob } from "../../hooks/useJobs";
import type { JobApplication } from "../../types/job";

interface EditJobDialogProps {
  job: JobApplication;
  onClose: () => void;
}

export const EditJobDialog = ({ job, onClose }: EditJobDialogProps) => {
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const handleDelete = () => {
    if (window.confirm(`Delete the ${job.role} application at ${job.company}? This cannot be undone.`)) {
      deleteJob.mutate(job.id, { onSuccess: onClose });
    }
  };

  return (
    <Dialog title="Edit application" onClose={onClose}>
      <JobForm
        initialValues={job}
        submitLabel="Save changes"
        isSubmitting={updateJob.isPending}
        errorMessage={updateJob.error?.message ?? deleteJob.error?.message}
        onSubmit={(changes) => updateJob.mutate({ jobId: job.id, changes }, { onSuccess: onClose })}
        onCancel={onClose}
      />
      <div className="mt-6 border-t border-(--border) pt-4">
        <Button variant="danger" onClick={handleDelete} disabled={deleteJob.isPending}>
          {deleteJob.isPending ? "Deleting…" : "Delete application"}
        </Button>
      </div>
    </Dialog>
  );
};
