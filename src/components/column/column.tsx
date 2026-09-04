import React from 'react'
import { JobApplication } from '../../types/job'
import { Card } from '../card/card'

const Column = ({ status, jobs }: { status: string, jobs: JobApplication[] }) => {

    return (
        <div className="flex flex-col items-start border rounded-2xl bg-gray-800 gap-2 p-4">
            <h2>{status}</h2>
            {jobs.map(job => {
                return (
                    <Card job={job} />
                )
            })}
        </div>
    )
}

export default Column