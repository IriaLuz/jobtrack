import { JobApplication, Status } from '../../types/job'
import { Card } from '../card/card'

interface ColumnProps {
    status: Status
    jobs: JobApplication[]
}


export const Column = ({ status, jobs }: ColumnProps) => {

    return (
        <div className="flex-none  border rounded-2xl bg-gray-800 gap-2 p-4 w-103">
            <h2>{status}</h2>
            {jobs.map(job => {
                return (
                    <Card key={job.id} job={job} />
                )
            })}
        </div>
    )
}

