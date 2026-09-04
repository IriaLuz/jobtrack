import React from 'react'
import { JobApplication } from '../../types/job'
import { Card } from '../card/card'

const Column = ({ status, jobs }: { status: string, jobs: JobApplication[] }) => {

    return (
        <div className="flex-col items-start border rounded-2xl bg-gray-800 gap-2 p-4 w-[412px]  flex-none">
            <h2>{status}</h2>
            {jobs.map(job => {
                return (
                    <Card key={job.id} job={job} />
                )
            })}
        </div>
    )
}

export default Column