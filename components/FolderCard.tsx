'use client'

import { Folder } from '../lib/types'

interface Props {
  folder: Folder
  trackCount: number
  onClick: () => void
}

export default function FolderCard({ folder, trackCount, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="relative bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
    >
      <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-900/40 to-purple-600/20 select-none">
        <span className="text-4xl">📁</span>
        <span className="text-gray-400 text-xs">{trackCount} track{trackCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-3">
        <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{folder.name}</p>
        <p className="text-gray-500 text-xs mt-1">Folder</p>
      </div>
    </div>
  )
}
