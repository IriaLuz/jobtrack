import { Column } from '../column/column'
import type { JobApplication, Status } from '../../types/job'

interface BoardProps {
    statuses: readonly Status[]
    jobs: JobApplication[]
    onEditJob: (job: JobApplication) => void
    onPractiseJob: (job: JobApplication) => void
    onMoveJob: (jobId: string, status: Status) => void
}

export const Board = ({ statuses, jobs, onEditJob, onPractiseJob, onMoveJob }: BoardProps) => {
    const filteredJobsByStatus = (jobStatus: Status) => jobs.filter(j => j.status === jobStatus)

    return (
        <div className='flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2'>
            {statuses.map((status) => {
                return (
                    <Column
                        key={status}
                        status={status}
                        jobs={filteredJobsByStatus(status)}
                        onEditJob={onEditJob}
                        onPractiseJob={onPractiseJob}
                        onMoveJob={onMoveJob}
                    />
                )
            })}
        </div>
    )
}
