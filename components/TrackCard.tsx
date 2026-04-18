'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'
import TrackMenu from './TrackMenu'

interface Props {
  track: Track
  isActive: boolean
  isPlaying: boolean
  onClick: () => void
  onDelete?: (trackId: string) => void
  onTrackUpdated?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  isFolderTarget?: boolean
}

export default function TrackCard({ track, isActive, isPlaying, onClick, onDelete, onTrackUpdated, onAddToQueue, isFolderTarget }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={onClick}
      className={`relative bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden ${
        isActive ? 'ring-2 ring-purple-500' : ''
      } ${isFolderTarget ? 'ring-2 ring-amber-400' : ''}`}
    >
      <TrackMenu track={track} onDeleted={onDelete ?? ((_id: string) => {})} onTrackUpdated={onTrackUpdated ?? (() => {})} onAddToQueue={onAddToQueue} />
      <div
        {...listeners}
        className="w-full aspect-square flex items-center justify-center text-3xl select-none cursor-grab active:cursor-grabbing"
        style={getGradientStyle(track.id)}
      >
        {isFolderTarget ? '📁' : isPlaying ? '▶' : '♪'}
      </div>
      <div className="p-3">
        <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{track.title}</p>
        <p className="text-gray-500 text-xs mt-1 truncate">
          {track.uploader_email.split('@')[0]}
        </p>
      </div>
    </div>
  )
}
