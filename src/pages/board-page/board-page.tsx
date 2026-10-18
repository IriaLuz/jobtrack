import { useState } from "react";
import { sessionStore, type Session } from "../../auth/sessionStore";
import { Board } from "../../components/board/board";
import { Button } from "../../components/button/button";
import { Dialog } from "../../components/dialog/dialog";
import { PracticePanel } from "../../components/practice-panel/practice-panel";
import { useJobs, useUpdateJob } from "../../hooks/useJobs";
import { STATUSES, type JobApplication, type Status } from "../../types/job";
import { CreateJobDialog } from "./create-job-dialog";
import { EditJobDialog } from "./edit-job-dialog";

/** Which dialog is open. Editing or practising always carries the job, so "edit nothing" is impossible. */
type OpenDialog =
  | { kind: "createJob" }
  | { kind: "editJob"; job: JobApplication }
  | { kind: "practise"; job: JobApplication };

export const BoardPage = ({ session }: { session: Session }) => {
  const jobsQuery = useJobs();
  const moveJob = useUpdateJob();
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);

  const handleMoveJob = (jobId: string, status: Status) => {
    const job = jobsQuery.data?.find(({ id }) => id === jobId);
    if (job && job.status !== status) moveJob.mutate({ jobId, changes: { status } });
  };

  const renderBoard = () => {
    if (jobsQuery.isPending) return <p role="status">Loading your applications…</p>;

    if (jobsQuery.isError) {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>We couldn't load your applications: {jobsQuery.error.message}</p>
          <Button variant="secondary" onClick={() => void jobsQuery.refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    return (
      <>
        {jobsQuery.data.length === 0 && (
          <p className="text-sm">No applications yet. Choose "Add application" to track your first one.</p>
        )}
        <Board
          statuses={STATUSES}
          jobs={jobsQuery.data}
          onEditJob={(job) => setOpenDialog({ kind: "editJob", job })}
          onPractiseJob={(job) => setOpenDialog({ kind: "practise", job })}
          onMoveJob={handleMoveJob}
        />
      </>
    );
  };

  return (
    <div className="flex h-svh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) px-4 py-3 sm:px-6">
        <h1 className="text-xl">jobtrack</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm sm:inline">{session.user.email}</span>
          <Button variant="secondary" onClick={sessionStore.signOut}>
            Sign out
          </Button>
          <Button onClick={() => setOpenDialog({ kind: "createJob" })}>Add application</Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
        {moveJob.isError && (
          <p role="alert" className="text-sm text-(--danger)">
            Couldn't move the application: {moveJob.error.message}
          </p>
        )}
        {renderBoard()}
      </main>

      {openDialog?.kind === "createJob" && <CreateJobDialog onClose={closeDialog} />}
      {openDialog?.kind === "editJob" && <EditJobDialog job={openDialog.job} onClose={closeDialog} />}
      {openDialog?.kind === "practise" && (
        <Dialog title={`Interview practice: ${openDialog.job.role} at ${openDialog.job.company}`} onClose={closeDialog}>
          <PracticePanel job={openDialog.job} />
        </Dialog>
      )}
    </div>
  );
};
