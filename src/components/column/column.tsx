import { useState, type DragEvent } from 'react'
import { STATUS_LABELS, type JobApplication, type Status } from '../../types/job'
import { JOB_DRAG_TYPE } from '../board/jobDrag'
import { Card } from '../card/card'

interface ColumnProps {
    status: Status
    jobs: JobApplication[]
    onEditJob: (job: JobApplication) => void
    onPractiseJob: (job: JobApplication) => void
    onMoveJob: (jobId: string, status: Status) => void
}

export const Column = ({ status, jobs, onEditJob, onPractiseJob, onMoveJob }: ColumnProps) => {
    const [isDropTarget, setIsDropTarget] = useState(false)
    const label = STATUS_LABELS[status]

    const handleDragOver = (event: DragEvent) => {
        if (!event.dataTransfer.types.includes(JOB_DRAG_TYPE)) return
        event.preventDefault() // tells the browser this column accepts the drop
        setIsDropTarget(true)
    }

    const handleDragLeave = (event: DragEvent) => {
        // Moving over a card inside the column also fires dragleave on the column; ignore that.
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setIsDropTarget(false)
    }

    const handleDrop = (event: DragEvent) => {
        event.preventDefault()
        setIsDropTarget(false)
        const jobId = event.dataTransfer.getData(JOB_DRAG_TYPE)
        if (jobId) onMoveJob(jobId, status)
    }

    return (
        <section
            aria-label={label}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex min-w-56 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border p-3 transition-colors ${
                isDropTarget ? 'border-(--accent-border) bg-(--accent-bg)' : 'border-(--border) bg-(--surface)'
            }`}
        >
            <h2 className="flex items-center justify-between px-1 text-sm tracking-wide uppercase">
                {label}
                <span className="rounded-full bg-(--surface-raised) px-2 py-0.5 text-xs text-(--text)">{jobs.length}</span>
            </h2>
            {jobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-(--border) p-4 text-center text-sm">No applications</p>
            ) : (
                jobs.map(job => (
                    <Card key={job.id} job={job} onEdit={() => onEditJob(job)} onPractise={() => onPractiseJob(job)} />
                ))
            )}
        </section>
    )
}
