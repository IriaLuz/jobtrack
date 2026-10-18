import type { DragEvent } from 'react'
import type { JobApplication } from '../../types/job'
import { JOB_DRAG_TYPE } from '../board/jobDrag'
import { Button } from '../button/button'

interface CardProps {
    job: JobApplication
    onEdit: () => void
    onPractise: () => void
}

export const Card = ({ job, onEdit, onPractise }: CardProps) => {
    const { company, role, salary, location, link } = job
    const details = [location, salary].filter(Boolean).join(' · ')
    const jobName = `${role} at ${company}`

    const handleDragStart = (event: DragEvent) => {
        event.dataTransfer.setData(JOB_DRAG_TYPE, job.id)
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <article
            draggable
            onDragStart={handleDragStart}
            aria-label={jobName}
            className="flex cursor-grab flex-col gap-3 rounded-xl border border-(--border) bg-(--surface-raised) p-4 active:cursor-grabbing"
        >
            <div className="flex flex-col items-start gap-1">
                <h3 className="break-words">{company}</h3>
                <p className="text-sm text-(--text-h)">{role}</p>
                {details && <p className="text-sm">{details}</p>}
                <a
                    className="text-sm text-(--accent) underline-offset-2 hover:underline"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Job post for ${jobName} (opens in a new tab)`}
                >
                    Job post ↗
                </a>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" size="small" onClick={onPractise} aria-label={`Practise for ${jobName}`}>
                    Practise
                </Button>
                <Button variant="secondary" size="small" onClick={onEdit} aria-label={`Edit ${jobName}`}>
                    Edit
                </Button>
            </div>
        </article>
    )
}
