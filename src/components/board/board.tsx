import React from 'react'
import Column from '../column/column'
import { JobApplication } from '../../types/job'

export const Board = ({ statuses, jobs }: { statuses: readonly string[], jobs: JobApplication[] }) => {
    const filteredJobsByStatus = (jobStatus: string) => jobs.filter(j => j.status === jobStatus)

    return (
        <div className='flex flex-row gap-4 border-[#2e303a] border rounded-2xl p-4 h-screen overflow-x-auto'>
            {statuses.map((status, i) => {
                return (
                    <Column key={i} status={status} jobs={filteredJobsByStatus(status)} />
                )
            })}
        </div>
    )
}
