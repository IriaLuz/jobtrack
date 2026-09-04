import React from 'react'

export const Board = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className='flex flex-row gap-4 border-[#2e303a] border rounded-2xl p-4 '>{children}</div>
    )
}
