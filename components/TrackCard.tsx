'use client'

import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  track: Track
  isActive: boolean
  isPlaying: boolean
  onClick: () => void
}

export default function TrackCard({ track, isActive, isPlaying, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
        isActive ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      <div
        className="w-full aspect-square flex items-center justify-center text-3xl select-none"
        style={getGradientStyle(track.id)}
      >
        {isPlaying ? '▶' : '♪'}
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
