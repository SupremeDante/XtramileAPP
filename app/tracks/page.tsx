'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Track, Folder } from '../../lib/types'
import FolderCard from '../../components/FolderCard'
import TrackCard from '../../components/TrackCard'
import UploadModal from '../../components/UploadModal'
import PlayerBar from '../../components/PlayerBar'
import { getTheme, saveTheme, applyTheme, ThemePreference } from '../../lib/theme'
import { getProfile, createProfile, getAvatarColor } from '../../lib/profile'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
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
  const [folders, setFolders] = useState<Folder[]>([])
  const [folderView, setFolderView] = useState<Folder | null>(null)
  const [folderTarget, setFolderTarget] = useState<string | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [createFolderName, setCreateFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playLoggedRef = useRef(false)
  const folderTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFolderTargetRef = useRef<string | null>(null)
  const pendingFolderTracksRef = useRef<[string, string] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
      await fetchFolders(session.user.id)
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

  async function fetchFolders(uid?: string) {
    const { data } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', uid ?? userId)
      .order('created_at', { ascending: true })
    if (data) setFolders(data as Folder[])
  }

  async function saveDisplayOrder(ordered: Track[]) {
    await Promise.all(
      ordered.map((t, i) =>
        supabase.from('tracks').update({ display_order: i }).eq('id', t.id)
      )
    )
  }

  async function handleDeleteFolder(folderId: string) {
    await supabase.from('tracks').update({ folder_id: null }).eq('folder_id', folderId)
    await supabase.from('folders').delete().eq('id', folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
    setTracks(prev => prev.map(t => t.folder_id === folderId ? { ...t, folder_id: null } : t))
    if (folderView?.id === folderId) setFolderView(null)
  }

  async function handleRenameFolder(folder: Folder, newName: string) {
    await supabase.from('folders').update({ name: newName }).eq('id', folder.id)
    setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: newName } : f))
    if (folderView?.id === folder.id) setFolderView(prev => prev ? { ...prev, name: newName } : null)
  }

  function handleFolderCreatedFromMenu() {
    fetchFolders()
    fetchTracks()
  }

  async function handleFolderDrop(name: string) {
    if (!pendingFolderTracksRef.current) return
    const [trackAId, trackBId] = pendingFolderTracksRef.current
    pendingFolderTracksRef.current = null
    setCreatingFolder(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCreatingFolder(false); return }
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({ user_id: session.user.id, name: name.trim() })
      .select()
      .single()
    if (!error && folder) {
      await Promise.all([
        supabase.from('tracks').update({ folder_id: folder.id }).eq('id', trackAId),
        supabase.from('tracks').update({ folder_id: folder.id }).eq('id', trackBId),
      ])
      await fetchFolders()
      await fetchTracks()
    }
    setCreatingFolder(false)
    setShowCreateFolder(false)
  }

  function handleDragStart(_event: DragStartEvent) {}

  function handleDragOver(event: DragOverEvent) {
    const { over, active } = event
    if (!over || (over.id as string) === (active.id as string)) {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = null
      setFolderTarget(null)
      return
    }
    const overId = over.id as string
    const isUnfolderedTrack = tracks.some(t => t.id === overId && !t.folder_id)
    if (isUnfolderedTrack && pendingFolderTargetRef.current !== overId) {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = overId
      folderTargetTimerRef.current = setTimeout(() => setFolderTarget(overId), 1000)
    } else if (!isUnfolderedTrack) {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = null
      setFolderTarget(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
    pendingFolderTargetRef.current = null

    if (folderTarget && over && folderTarget === (over.id as string) && active.id !== over.id) {
      pendingFolderTracksRef.current = [active.id as string, over.id as string]
      setFolderTarget(null)
      setCreateFolderName('')
      setShowCreateFolder(true)
      return
    }
    setFolderTarget(null)

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

  async function handleAudioPlay() {
    if (playLoggedRef.current || !activeTrack) return
    playLoggedRef.current = true
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    console.log('PLAY USER:', user)
    if (!user) return
    const { data, error } = await supabase.from('track_plays').insert({
      track_id: activeTrack.id,
      user_id: user.id,
    })
    console.log('PLAY INSERT RESULT:', { data, error })
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
    playLoggedRef.current = false
  }, [activeTrack?.id])

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
      <nav className="bg-[var(--color-bg-surface)] border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between">
        <span className="brand-chrome text-lg">XTRAMILE</span>
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
            className="btn-chrome text-sm px-4 py-2 rounded-lg font-medium"
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
        {folderView ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => setFolderView(null)}
                className="text-gray-500 hover:text-[var(--color-text-primary)] text-sm transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-[var(--color-text-primary)] text-base font-semibold">{folderView.name}</h2>
            </div>
            {tracks.filter(t => t.folder_id === folderView.id).length === 0 ? (
              <p className="text-gray-600 text-sm">This folder is empty.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tracks.filter(t => t.folder_id === folderView.id).map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isActive={activeTrack?.id === track.id}
                    isPlaying={isPlaying && activeTrack?.id === track.id}
                    onClick={() => handleTrackClick(track)}
                    onDelete={handleTrackDeleted}
                    onTrackUpdated={handleTrackUpdated}
                    onAddToQueue={addToQueue}
                    onFolderCreated={handleFolderCreatedFromMenu}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[var(--color-text-label)] text-xs uppercase tracking-widest mb-3">Folders</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      trackCount={tracks.filter(t => t.folder_id === folder.id).length}
                      onClick={() => setFolderView(folder)}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </div>
              </div>
            )}
            <h2 className="text-[var(--color-text-label)] text-xs uppercase tracking-widest mb-5">All Tracks</h2>
            {filteredTracks.filter(t => !t.folder_id).length === 0 && folders.length === 0 ? (
              <p className="text-gray-600 text-sm">No tracks yet. Upload the first one!</p>
            ) : filteredTracks.filter(t => !t.folder_id).length === 0 ? (
              <p className="text-gray-600 text-sm">All tracks are in folders.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filteredTracks.filter(t => !t.folder_id).map(t => t.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTracks.filter(t => !t.folder_id).map(track => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        isActive={activeTrack?.id === track.id}
                        isPlaying={isPlaying && activeTrack?.id === track.id}
                        onClick={() => handleTrackClick(track)}
                        onDelete={handleTrackDeleted}
                        onTrackUpdated={handleTrackUpdated}
                        onAddToQueue={addToQueue}
                        onFolderCreated={handleFolderCreatedFromMenu}
                        isFolderTarget={folderTarget === track.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </main>

      {showCreateFolder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => { setShowCreateFolder(false); pendingFolderTracksRef.current = null }}>
          <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-1">New Folder</h2>
            <p className="text-gray-500 text-xs mb-3">Name your folder for the 2 tracks being grouped.</p>
            <input
              type="text"
              value={createFolderName}
              onChange={e => setCreateFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolderName.trim() && handleFolderDrop(createFolderName)}
              placeholder="Folder name"
              autoFocus
              className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateFolder(false); pendingFolderTracksRef.current = null }} className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleFolderDrop(createFolderName)} disabled={creatingFolder || !createFolderName.trim()} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {creatingFolder ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} onEnded={handleNext} onPlay={handleAudioPlay} />

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
