'use client'

import { RefObject, useEffect, useState } from 'react'
import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  track: Track
  isPlaying: boolean
  audioRef: RefObject<HTMLAudioElement | null>
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerBar({ track, isPlaying, audioRef, onPlayPause, onPrev, onNext }: Props) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function onTimeUpdate() {
      setProgress(audio!.duration ? (audio!.currentTime / audio!.duration) * 100 : 0)
      setCurrentTime(formatTime(audio!.currentTime))
    }
    function onLoadedMetadata() {
      setDuration(formatTime(audio!.duration))
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  // audioRef is a stable ref object — intentionally empty dep array
  }, [])

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-player)] border-t border-[var(--color-border)] px-5 py-3 flex items-center gap-5">
      <div
        className="w-11 h-11 rounded-md flex-shrink-0 relative overflow-hidden"
        style={track.cover_url ? undefined : getGradientStyle(track.id)}
      >
        {track.cover_url && (
          <img src={track.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{track.title}</p>
        <p className="text-gray-500 text-xs truncate">{track.uploader_email.split('@')[0]}</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onPrev} className="text-gray-400 hover:text-[var(--color-text-primary)] text-lg">⏮</button>
        <button onClick={onPlayPause} className="text-[var(--color-text-primary)] hover:text-purple-400 text-2xl">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} className="text-gray-400 hover:text-[var(--color-text-primary)] text-lg">⏭</button>
      </div>
      <div className="flex flex-1 items-center gap-3 max-w-md">
        <span className="text-gray-500 text-xs w-8 text-right">{currentTime}</span>
        <div
          className="flex-1 h-1 bg-[var(--color-bg-progress)] rounded cursor-pointer"
          onClick={handleSeek}
        >
          <div className="h-full rounded relative overflow-hidden" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #9a9a9a, #d8d8d8)' }}>
            <div className={`progress-inner-glow${isPlaying ? '' : ' paused'}`} />
          </div>
        </div>
        <span className="text-gray-500 text-xs w-8">{duration}</span>
      </div>
    </div>
  )
}
