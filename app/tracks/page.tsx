'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Track } from '../../lib/types'
import TrackCard from '../../components/TrackCard'
import UploadModal from '../../components/UploadModal'
import PlayerBar from '../../components/PlayerBar'
import { getTheme, saveTheme, applyTheme, ThemePreference } from '../../lib/theme'
import { getProfile, createProfile, getAvatarColor } from '../../lib/profile'
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export default function TracksPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarColor, setAvatarColor] = useState('')
  const [theme, setTheme] = useState<ThemePreference>('system')
  const [searchQuery, setSearchQuery] = useState('')
  const [queue, setQueue] = useState<Track[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? null)
      setUserId(session.user.id)
      let profile = await getProfile(session.user.id)
      if (!profile) {
        const meta = session.user.user_metadata
        await createProfile(session.user.id, meta.display_name ?? '', meta.handle ?? '')
        profile = await getProfile(session.user.id)
      }
      setDisplayName(profile?.display_name ?? '')
      setAvatarColor(getAvatarColor(session.user.id))
      const savedTheme = await getTheme(session.user.id)
      setTheme(savedTheme)
      applyTheme(savedTheme)
      await fetchTracks(session.user.id)
    }
    init()
  }, [])

  async function handleThemeChange(newTheme: ThemePreference) {
    setTheme(newTheme)
    applyTheme(newTheme)
    if (userId) await saveTheme(userId, newTheme)
  }

  function handleTrackUpdated(updated: Track) {
    setTracks(prev => prev.map(t => t.id === updated.id ? updated : t))
    if (activeTrack?.id === updated.id) setActiveTrack(updated)
  }

  function handleTrackDeleted(trackId: string) {
    if (!trackId) { fetchTracks(); return }
    setTracks(prev => prev.filter(t => t.id !== trackId))
    if (activeTrack?.id === trackId) {
      audioRef.current?.pause()
      setActiveTrack(null)
      setIsPlaying(false)
    }
  }

  async function fetchTracks(uid?: string) {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', uid ?? userId)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (!error && data) setTracks(data as Track[])
  }

  async function saveDisplayOrder(ordered: Track[]) {
    await Promise.all(
      ordered.map((t, i) =>
        supabase.from('tracks').update({ display_order: i }).eq('id', t.id)
      )
    )
  }

  function handleDragStart(_event: DragStartEvent) {}

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = tracks.findIndex(t => t.id === active.id)
    const newIdx = tracks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tracks, oldIdx, newIdx)
    setTracks(reordered)
    saveDisplayOrder(reordered)
  }

  function handleTrackClick(track: Track) {
    if (activeTrack?.id === track.id) {
      togglePlayPause()
      return
    }
    setActiveTrack(track)
    setIsPlaying(true)
  }

  function togglePlayPause() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(prev => !prev)
  }

  function handlePrev() {
    if (!activeTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === activeTrack.id)
    setActiveTrack(tracks[(idx - 1 + tracks.length) % tracks.length])
    setIsPlaying(true)
  }

  function addToQueue(track: Track) {
    setQueue(prev => [...prev, track])
  }

  function handleNext() {
    if (queue.length > 0) {
      const [next, ...rest] = queue
      setQueue(rest)
      setActiveTrack(next)
      setIsPlaying(true)
      return
    }
    if (!activeTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === activeTrack.id)
    setActiveTrack(tracks[(idx + 1) % tracks.length])
    setIsPlaying(true)
  }

  useEffect(() => {
    if (!activeTrack || !audioRef.current) return
    const { data } = supabase.storage.from('audio').getPublicUrl(activeTrack.file_path)
    const publicUrl = data.publicUrl

    async function load() {
      try {
        const cache = await caches.open('xtramile-offline')
        const cached = await cache.match(publicUrl)
        if (cached) {
          const blob = await cached.blob()
          audioRef.current!.src = URL.createObjectURL(blob)
          audioRef.current!.play().catch(() => setIsPlaying(false))
          return
        }
      } catch {}
      audioRef.current!.src = publicUrl
      audioRef.current!.play().catch(() => setIsPlaying(false))
    }

    load()
  }, [activeTrack])

  useEffect(() => {
    if (!activeTrack) return
    const updated = tracks.find(t => t.id === activeTrack.id)
    if (updated && updated.file_path !== activeTrack.file_path) {
      setActiveTrack(updated)
    }
  }, [tracks])

  const filteredTracks = searchQuery.trim()
    ? tracks.filter(track => {
        if (track.user_id !== userId) return false
        const q = searchQuery.toLowerCase()
        return (
          track.title.toLowerCase().includes(q) ||
          (track.bpm != null && track.bpm.toString().includes(q)) ||
          (track.key != null && track.key.toLowerCase().includes(q))
        )
      })
    : tracks

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] pb-24">
      <nav className="bg-[var(--color-bg-surface)] border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between relative">
        <span className="text-[var(--color-text-primary)] font-bold text-lg">🎵 Xtramile</span>
        <img src="/assets/xtramile-logo.png" alt="Xtramile" className="absolute left-1/2 -translate-x-1/2" style={{ maxHeight: '48px', width: 'auto' }} />
        <div className="flex items-center gap-4">
          <input
            type="search"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-gray-500 text-sm px-3 py-1.5 rounded-lg w-48 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => setShowUpload(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Upload Track
          </button>
          <select
            value={theme}
            onChange={e => handleThemeChange(e.target.value as ThemePreference)}
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-2 py-1 rounded-lg"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
          {displayName && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-gray-400 text-sm hidden sm:block">{userEmail}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-gray-500 hover:text-[var(--color-text-primary)] text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="p-6">
        <h2 className="text-[var(--color-text-label)] text-xs uppercase tracking-widest mb-5">All Tracks</h2>
        {tracks.length === 0 ? (
          <p className="text-gray-600 text-sm">No tracks yet. Upload the first one!</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredTracks.map(t => t.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTracks.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isActive={activeTrack?.id === track.id}
                    isPlaying={isPlaying && activeTrack?.id === track.id}
                    onClick={() => handleTrackClick(track)}
                    onDelete={handleTrackDeleted}
                    onTrackUpdated={handleTrackUpdated}
                    onAddToQueue={addToQueue}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <audio ref={audioRef} onEnded={handleNext} />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchTracks(); setShowUpload(false) }}
          userEmail={userEmail ?? ''}
        />
      )}

      {activeTrack && (
        <PlayerBar
          key={activeTrack.id}
          track={activeTrack}
          isPlaying={isPlaying}
          audioRef={audioRef}
          onPlayPause={togglePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      {queue.length > 0 && (
        <div className="fixed bottom-20 right-4 z-40 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          {queue.length} in queue
        </div>
      )}
    </div>
  )
}
