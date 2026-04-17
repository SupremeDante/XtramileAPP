'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Track } from '../../lib/types'
import TrackCard from '../../components/TrackCard'
import UploadModal from '../../components/UploadModal'
import PlayerBar from '../../components/PlayerBar'
import { getTheme, saveTheme, applyTheme, ThemePreference } from '../../lib/theme'

export default function TracksPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemePreference>('system')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? null)
      setUserId(session.user.id)
      const savedTheme = await getTheme(session.user.id)
      setTheme(savedTheme)
      applyTheme(savedTheme)
      await fetchTracks()
    }
    init()
  }, [])

  async function handleThemeChange(newTheme: ThemePreference) {
    setTheme(newTheme)
    applyTheme(newTheme)
    if (userId) await saveTheme(userId, newTheme)
  }

  async function fetchTracks() {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setTracks(data as Track[])
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

  function handleNext() {
    if (!activeTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === activeTrack.id)
    setActiveTrack(tracks[(idx + 1) % tracks.length])
    setIsPlaying(true)
  }

  useEffect(() => {
    if (!activeTrack || !audioRef.current) return
    const { data } = supabase.storage.from('audio').getPublicUrl(activeTrack.file_path)
    audioRef.current.src = data.publicUrl
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [activeTrack])

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] pb-24">
      <nav className="bg-[var(--color-bg-surface)] border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between relative">
        <span className="text-[var(--color-text-primary)] font-bold text-lg">🎵 Xtramile</span>
        <img src="/assets/xtramile-logo.png" alt="Xtramile" className="absolute left-1/2 -translate-x-1/2" style={{ maxHeight: '48px', width: 'auto' }} />
        <div className="flex items-center gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                isActive={activeTrack?.id === track.id}
                isPlaying={isPlaying && activeTrack?.id === track.id}
                onClick={() => handleTrackClick(track)}
              />
            ))}
          </div>
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
    </div>
  )
}
