'use client'

import { RefObject, useEffect, useRef, memo } from 'react'
import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  track: Track
  isPlaying: boolean
  audioRef: RefObject<HTMLAudioElement | null>
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  ownerDisplayName?: string
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function PlayerBar({ track, isPlaying, audioRef, onPlayPause, onPrev, onNext }: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const timeDisplayRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const scrubbingRef = useRef(false)
  const scrubTimeRef = useRef<number | null>(null)
  const coverRef = useRef<HTMLDivElement>(null)

  // rAF loop — direct DOM updates, zero re-renders
  useEffect(() => {
    function tick() {
      const audio = audioRef.current
      if (audio && audio.duration > 0) {
        const displayTime = (scrubbingRef.current && scrubTimeRef.current !== null)
          ? scrubTimeRef.current
          : audio.currentTime
        const pct = (displayTime / audio.duration) * 100
        if (fillRef.current) fillRef.current.style.width = `${pct}%`
        if (sliderRef.current) sliderRef.current.setAttribute('aria-valuenow', String(Math.round(pct)))
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = `${formatTime(displayTime)} / ${formatTime(audio.duration)}`
        }
        if (coverRef.current) {
          const progress = displayTime / audio.duration
          const baseRotation = progress * 1800
          const normalizedAngle = baseRotation % 360
          const distanceToEdge = Math.min(
            Math.abs(normalizedAngle - 90),
            Math.abs(normalizedAngle - 270)
          )
          const speedBoost = 1 + (1 - Math.min(distanceToEdge, 90) / 90) * 0.8
          const rotateY = baseRotation * speedBoost
          coverRef.current.style.transform = `rotateY(${rotateY.toFixed(2)}deg)`
        }
      } else if (timeDisplayRef.current && timeDisplayRef.current.textContent !== '0:00 / 0:00') {
        timeDisplayRef.current.textContent = '0:00 / 0:00'
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // audioRef is a stable ref object — intentionally empty dep array
  }, [])

  function timeFromPointer(e: React.PointerEvent<HTMLDivElement>): number {
    const audio = audioRef.current
    if (!audio || !audio.duration) return 0
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubbingRef.current = true
    scrubTimeRef.current = timeFromPointer(e)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return
    scrubTimeRef.current = timeFromPointer(e)
  }

  function handlePointerUp() {
    if (scrubbingRef.current && scrubTimeRef.current !== null) {
      const audio = audioRef.current
      if (audio) audio.currentTime = scrubTimeRef.current
    }
    scrubbingRef.current = false
    scrubTimeRef.current = null
  }

  function handleSliderKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5)
    if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5)
  }

  return (
    <div
      className="mini-player-shell"
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: '50%',
        zIndex: 50,
        maxWidth: 520,
        minWidth: 320,
        width: 'fit-content',
        borderRadius: 999,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Cover art — perspective container → rotating card → front+back faces */}
      <div className="flex-shrink-0" style={{ width: 36, height: 36, perspective: '1200px' }}>
        <div ref={coverRef} style={{ width: 36, height: 36, transformStyle: 'preserve-3d', position: 'relative' }}>
          {/* Front face */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', ...(!track.cover_url ? getGradientStyle(track.id) : {}) }}
          >
            {track.cover_url && <img src={track.cover_url} alt="" className="w-full h-full object-cover" draggable={false} />}
          </div>
          {/* Back face — same image, pre-rotated 180° so it shows when front faces away */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', ...(!track.cover_url ? getGradientStyle(track.id) : {}) }}
          >
            {track.cover_url && <img src={track.cover_url} alt="" className="w-full h-full object-cover" draggable={false} />}
          </div>
        </div>
      </div>

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p
          className="text-[var(--color-text-primary)] text-xs font-semibold"
          style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {track.title.replace(/_/g, ' ')}
        </p>

        {/* 24px touch target wrapping 4px visual bar */}
        <div
          ref={sliderRef}
          role="slider"
          aria-label="Playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleSliderKey}
          className="mini-player-seek"
          style={{ height: 24, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <div
            className="mini-player-track"
            style={{ width: '100%', height: 4, borderRadius: 2, position: 'relative' }}
          >
            <div ref={fillRef} className="mini-player-fill" style={{ height: '100%', width: '0%', borderRadius: 2 }} />
          </div>
        </div>

        <span
          ref={timeDisplayRef}
          style={{
            fontSize: 9,
            color: 'var(--color-text-label)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          0:00 / 0:00
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transform: 'scale(0.85)', transformOrigin: 'center' }}>
        <button
          onClick={onPrev}
          aria-label="Previous track"
          className="mini-player-btn opacity-70 hover:opacity-100 transition-opacity"
        >
          <img src="/icons/back-button.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
        </button>
        <button
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="mini-player-btn opacity-90 hover:opacity-100 transition-opacity"
        >
          <img
            src={isPlaying ? '/icons/pause-button.png' : '/icons/play-button.png'}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            draggable={false}
          />
        </button>
        <button
          onClick={onNext}
          aria-label="Next track"
          className="mini-player-btn opacity-70 hover:opacity-100 transition-opacity"
        >
          <img src="/icons/next-button.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
        </button>
      </div>
    </div>
  )
}

export default memo(PlayerBar)
