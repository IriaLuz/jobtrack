import { Dialog } from "../../components/dialog/dialog";
import { JobForm } from "../../components/job-form/job-form";
import { useCreateJob } from "../../hooks/useJobs";

export const CreateJobDialog = ({ onClose }: { onClose: () => void }) => {
  const createJob = useCreateJob();

  return (
    <Dialog title="Add application" onClose={onClose}>
      <JobForm
        submitLabel="Add application"
        isSubmitting={createJob.isPending}
        errorMessage={createJob.error?.message}
        onSubmit={(input) => createJob.mutate(input, { onSuccess: onClose })}
        onCancel={onClose}
      />
    </Dialog>
  );
};
