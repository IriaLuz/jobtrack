import React from 'react'
import { JobApplication } from '../../types/job'
import { Card } from '../card/card'

const Column = ({ status, jobs }: { status: string, jobs: JobApplication[] }) => {

    console.log(jobs)


    return (
        <div className="flex flex-col items-start gap-2  ">
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