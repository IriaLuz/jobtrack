import React from 'react'
import { JobApplication } from '../../types/job'

export const Card = ({ job }: { job: JobApplication }) => {
    const { company, role, salary, link } = job
    return (
        <div className="flex flex-col items-start gap-2  border-[#2e303a] border rounded-2xl bg-(--code-bg) p-4 h-min min-h-45">
            <div>{company}</div>
            <div>{role}</div>
            <div>{salary}</div>
            <a className="ml-auto mt-auto" href={link}>See more</a>
        </div>
    )
}
