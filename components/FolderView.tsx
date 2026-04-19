'use client'

import { useState } from 'react'
import { Folder, Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  folder: Folder
  folderTracks: Track[]
  activeTrack: Track | null
  onTrackClick: (track: Track) => void
  onBack: () => void
}

export default function FolderView({ folder, folderTracks, activeTrack, onTrackClick, onBack }: Props) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
    folderTracks[0]?.id ?? null
  )

  const selectedTrack = folderTracks.find(t => t.id === selectedTrackId) ?? null

  function handleRowClick(track: Track) {
    setSelectedTrackId(track.id)
    onTrackClick(track)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-[var(--color-text-primary)] text-sm transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-[var(--color-text-primary)] text-base font-semibold">{folder.name}</h2>
      </div>

      {folderTracks.length === 0 ? (
        <p className="text-gray-600 text-sm">This folder is empty.</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-2/5">
            <div
              className="w-full aspect-square rounded-xl overflow-hidden relative"
              style={!selectedTrack?.cover_url ? getGradientStyle(selectedTrack?.id ?? folder.id) : { background: '#1a1a1a' }}
            >
              {selectedTrack?.cover_url && (
                <img
                  src={selectedTrack.cover_url}
                  alt={selectedTrack.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="mt-3">
              <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{folder.name}</p>
              <p className="text-gray-500 text-xs mt-1">{folderTracks.length} track{folderTracks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="md:w-3/5 flex flex-col gap-1 overflow-y-auto max-h-[480px]">
            {folderTracks.map(track => (
              <button
                key={track.id}
                onClick={() => handleRowClick(track)}
                className={`flex items-center gap-3 p-2 rounded-lg text-left w-full transition-colors hover:bg-[var(--color-bg-surface)] ${activeTrack?.id === track.id ? 'ring-2 ring-[var(--color-accent-ring)]' : ''}`}
              >
                <div
                  className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative"
                  style={!track.cover_url ? getGradientStyle(track.id) : { background: '#1a1a1a' }}
                >
                  {track.cover_url && (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-[var(--color-text-primary)] text-sm font-medium truncate">{track.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
