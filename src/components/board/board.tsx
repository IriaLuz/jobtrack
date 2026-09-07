import { Column } from '../column/column'
import { JobApplication, Status } from '../../types/job'

interface BoardProps {
    statuses: Status[]
    jobs: JobApplication[]
}

export const Board = ({ statuses, jobs }: BoardProps) => {
    const filteredJobsByStatus = (jobStatus: Status) => jobs.filter(j => j.status === jobStatus)

    return (
        <div className='flex flex-row gap-4 border-[#2e303a] border rounded-2xl p-4 h-screen overflow-x-auto'>
            {statuses.map((status) => {
                return (
                    <Column key={status} status={status} jobs={filteredJobsByStatus(status)} />
                )
            })}
        </div>
    )
}
