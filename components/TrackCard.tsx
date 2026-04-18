'use client'

import { useEffect, useRef } from 'react'
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
  onFolderCreated?: () => void
  isFolderTarget?: boolean
}

export default function TrackCard({ track, isActive, isPlaying: _isPlaying, onClick, onDelete, onTrackUpdated, onAddToQueue, onFolderCreated, isFolderTarget }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id })
  const wasDragging = useRef(false)

  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  function handleClick() {
    if (wasDragging.current) { wasDragging.current = false; return }
    onClick()
  }

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
      onClick={handleClick}
      className={`relative bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden ${
        isActive ? 'ring-2 ring-[var(--color-accent-ring)]' : ''
      } ${isFolderTarget ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="absolute top-2 right-2 z-20">
        <TrackMenu track={track} onDeleted={onDelete ?? ((_id: string) => {})} onTrackUpdated={onTrackUpdated ?? (() => {})} onAddToQueue={onAddToQueue} onFolderCreated={onFolderCreated} />
      </div>
      <div
        {...listeners}
        className={`w-full aspect-square relative flex items-center justify-center text-3xl select-none ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        style={track.cover_url ? undefined : getGradientStyle(track.id)}
      >
        {track.cover_url && (
          <img
            src={track.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        )}
        {isFolderTarget && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-amber-500/40 pointer-events-none">
            <span className="text-4xl">📁</span>
            <span className="text-white text-[10px] font-bold mt-1.5 bg-black/55 px-2.5 py-0.5 rounded-full">Drop to create folder</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{track.title.replace(/_/g, ' ')}</p>
        <p className="text-gray-500 text-xs mt-1 truncate">
          {track.uploader_email.split('@')[0]}
        </p>
      </div>
    </div>
  )
}
