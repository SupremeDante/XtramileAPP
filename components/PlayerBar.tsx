'use client'

import { RefObject, useEffect, useRef, useState, memo } from 'react'
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

function MarqueeText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const staticSpanRef = useRef<HTMLSpanElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!containerRef.current || !staticSpanRef.current) return
      setOverflows(staticSpanRef.current.scrollWidth > containerRef.current.clientWidth + 1)
    }, 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', minWidth: 0, ...style }}>
      {overflows ? (
        <div className="marquee-scroll" style={{ display: 'flex', width: 'max-content' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span aria-hidden="true" style={{ whiteSpace: 'nowrap' }}>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      ) : (
        <span ref={staticSpanRef} style={{ whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {text}
        </span>
      )}
    </div>
  )
}

function VolumeIcon({ volume }: { volume: number }) {
  if (volume === 0) {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M3 8H3L3 12H6L10 15V5L6 8H3Z" />
        <line x1="13" y1="7" x2="17" y2="13" />
        <line x1="17" y1="7" x2="13" y2="13" />
      </svg>
    )
  }
  if (volume < 50) {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M3 8H3L3 12H6L10 15V5L6 8H3Z" />
        <path d="M12.5 7.5 Q14.5 10 12.5 12.5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
      <path d="M3 8H3L3 12H6L10 15V5L6 8H3Z" />
      <path d="M12.5 7.5 Q14.5 10 12.5 12.5" />
      <path d="M14.5 5.5 Q17.5 10 14.5 14.5" />
    </svg>
  )
}

function getVolumeFill(vol: number, dragging: boolean): { background: string; boxShadow: string } {
  const t = vol / 100
  const boost = dragging ? 1.25 : 1
  const topAlpha = (0.22 + t * 0.78).toFixed(2)
  const btmAlpha = (0.14 + t * 0.56).toFixed(2)
  const g1 = Math.min(0.95, (0.03 + t * 0.67) * boost).toFixed(2)
  const g2 = Math.min(0.55, (0.01 + t * 0.29) * boost).toFixed(2)
  const g3 = Math.min(0.28, t * 0.12 * boost).toFixed(2)
  return {
    background: `linear-gradient(to bottom, rgba(255,255,255,${topAlpha}) 0%, rgba(255,255,255,${btmAlpha}) 100%)`,
    boxShadow: dragging
      ? `0 0 6px 3px rgba(255,255,255,${g1}), 0 0 14px 6px rgba(255,255,255,${g2}), 0 0 22px 8px rgba(255,255,255,${g3})`
      : `0 0 4px 2px rgba(255,255,255,${g1}), 0 0 10px 4px rgba(255,255,255,${g2})`,
  }
}

function PlayerBar({ track, isPlaying, audioRef, onPlayPause, onPrev, onNext, ownerDisplayName }: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const timeDisplayRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const scrubbingRef = useRef(false)
  const scrubTimeRef = useRef<number | null>(null)
  const coverRef = useRef<HTMLDivElement>(null)

  const [volume, setVolume] = useState(100)
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)
  const [isVolumeDragging, setIsVolumeDragging] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const prevVolumeRef = useRef(100)
  const volumeStateRef = useRef(100)
  const volumeContainerRef = useRef<HTMLDivElement>(null)
  const volumeTrackRef = useRef<HTMLDivElement>(null)
  const volumeFillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      const v = Math.round(audio.volume * 100)
      setVolume(v)
      volumeStateRef.current = v
      prevVolumeRef.current = v
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isLooping
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLooping])

  useEffect(() => {
    if (!isVolumeOpen) return
    function handleOutside(e: PointerEvent) {
      if (volumeContainerRef.current && !volumeContainerRef.current.contains(e.target as Node)) {
        setIsVolumeOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [isVolumeOpen])

  useEffect(() => {
    const el = volumeContainerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 5 : -5
      const next = Math.max(0, Math.min(100, volumeStateRef.current + delta))
      volumeStateRef.current = next
      setVolume(next)
      if (audioRef.current) audioRef.current.volume = next / 100
      if (next > 0) prevVolumeRef.current = next
      if (volumeFillRef.current) volumeFillRef.current.style.height = `${next}%`
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function applyVolume(v: number) {
    const clamped = Math.max(0, Math.min(100, v))
    setVolume(clamped)
    volumeStateRef.current = clamped
    if (audioRef.current) audioRef.current.volume = clamped / 100
    if (clamped > 0) prevVolumeRef.current = clamped
    if (volumeFillRef.current) volumeFillRef.current.style.height = `${clamped}%`
  }

  function volumeFromPointer(e: React.PointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return Math.round(ratio * 100)
  }

  function handleVolumeTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsVolumeDragging(true)
    applyVolume(volumeFromPointer(e))
  }

  function handleVolumeTrackPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isVolumeDragging) return
    applyVolume(volumeFromPointer(e))
  }

  function handleVolumeTrackPointerUp() {
    setIsVolumeDragging(false)
  }

  function handleVolumeIconClick() {
    setIsVolumeOpen(prev => !prev)
  }

  function handleVolumeIconDoubleClick() {
    if (volume > 0) {
      applyVolume(0)
    } else {
      applyVolume(prevVolumeRef.current || 80)
    }
  }

  function handleVolumeKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowUp') { e.preventDefault(); applyVolume(volume + 5) }
    if (e.key === 'ArrowDown') { e.preventDefault(); applyVolume(volume - 5) }
    if (e.key === 'Escape') setIsVolumeOpen(false)
    if (e.key === 'm' || e.key === 'M') {
      volume > 0 ? applyVolume(0) : applyVolume(prevVolumeRef.current || 80)
    }
  }

  return (
    <div
      className="mini-player-shell"
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: '50%',
        zIndex: 50,
        maxWidth: 720,
        minWidth: 320,
        width: 'fit-content',
        borderRadius: 999,
        padding: '4px 10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Cover art */}
      <div className="flex-shrink-0" style={{ width: 28, height: 28, perspective: '1200px' }}>
        <div ref={coverRef} style={{ width: 28, height: 28, transformStyle: 'preserve-3d', position: 'relative' }}>
          <div
            className="rounded-lg overflow-hidden"
            style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', ...(!track.cover_url ? getGradientStyle(track.id) : {}) }}
          >
            {track.cover_url && <img src={track.cover_url} alt="" className="w-full h-full object-cover" draggable={false} />}
          </div>
          <div
            className="rounded-lg overflow-hidden"
            style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', ...(!track.cover_url ? getGradientStyle(track.id) : {}) }}
          >
            {track.cover_url && <img src={track.cover_url} alt="" className="w-full h-full object-cover" draggable={false} />}
          </div>
        </div>
      </div>

      {/* Track info — title + artist stacked inside this block only */}
      <div style={{ flex: '0 0 130px', width: 130, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>
        <MarqueeText
          key={track.title}
          text={track.title.replace(/_/g, ' ')}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}
        />
        {ownerDisplayName && (
          <MarqueeText
            key={ownerDisplayName}
            text={ownerDisplayName}
            style={{ fontSize: 10, color: 'var(--color-text-label)', opacity: 0.7, lineHeight: 1.3 }}
          />
        )}
      </div>

      {/* Progress bar + time — inline horizontal, flex-grows to fill space */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
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
          style={{ flex: 1, minWidth: 60, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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
            fontSize: 16,
            color: 'var(--color-text-label)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.03em',
            userSelect: 'none',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            opacity: 0.65,
            flexShrink: 0,
          }}
        >
          0:00 / 0:00
        </span>
      </div>

      {/* Controls — prev · play · next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={onPrev} aria-label="Previous track" className="mini-player-btn mini-player-icon-btn" style={{ opacity: 0.65, color: 'currentColor' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
            <rect x="5" y="5" width="2.5" height="14" rx="0.5" />
            <polygon points="8,12 18,6 18,18" />
          </svg>
        </button>
        <button
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="mini-player-btn mini-player-icon-btn"
          style={{
            color: 'currentColor',
            opacity: 1,
            filter: isPlaying ? 'drop-shadow(0 0 5px rgba(255,255,255,0.65))' : 'none',
          }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
              <path d="M6 4l14 8-14 8V4z" />
            </svg>
          )}
        </button>
        <button onClick={onNext} aria-label="Next track" className="mini-player-btn mini-player-icon-btn" style={{ opacity: 0.65, color: 'currentColor' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
            <polygon points="6,6 16,12 6,18" />
            <rect x="16.5" y="5" width="2.5" height="14" rx="0.5" />
          </svg>
        </button>
      </div>

      {/* Loop button */}
      <button
        onClick={() => setIsLooping(prev => !prev)}
        aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
        aria-pressed={isLooping}
        className="mini-player-btn mini-player-icon-btn"
        style={{
          opacity: isLooping ? 1 : 0.4,
          color: 'currentColor',
          filter: isLooping ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      </button>

      {/* Volume control */}
      <div
        ref={volumeContainerRef}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onKeyDown={handleVolumeKey}
      >
        {isVolumeOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 40,
              height: 130,
              borderRadius: 999,
              background: 'rgba(22, 22, 22, 0.97)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 6px 28px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 0.5px rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 0',
              zIndex: 60,
            }}
          >
            <div
              ref={volumeTrackRef}
              role="slider"
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volume}
              tabIndex={0}
              onPointerDown={handleVolumeTrackPointerDown}
              onPointerMove={handleVolumeTrackPointerMove}
              onPointerUp={handleVolumeTrackPointerUp}
              onPointerCancel={handleVolumeTrackPointerUp}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ns-resize',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: '100%',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.12)',
                  position: 'relative',
                }}
              >
                <div
                  ref={volumeFillRef}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${volume}%`,
                    ...getVolumeFill(volume, isVolumeDragging),
                    borderRadius: 2,
                    transition: isVolumeDragging
                      ? 'box-shadow 0.1s ease, background 0.1s ease'
                      : 'height 0.08s ease, box-shadow 0.35s ease, background 0.35s ease',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleVolumeIconClick}
          onDoubleClick={handleVolumeIconDoubleClick}
          aria-label={volume === 0 ? 'Unmute' : 'Volume'}
          aria-expanded={isVolumeOpen}
          className="mini-player-btn mini-player-icon-btn"
          style={{ opacity: isVolumeOpen ? 1 : 0.6 }}
        >
          <VolumeIcon volume={volume} />
        </button>
      </div>
    </div>
  )
}

export default memo(PlayerBar)
