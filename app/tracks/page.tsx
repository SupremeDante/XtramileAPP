'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Track, Folder } from '../../lib/types'
import FolderCard from '../../components/FolderCard'
import TrackCard from '../../components/TrackCard'
import UploadModal from '../../components/UploadModal'
import PlayerBar from '../../components/PlayerBar'
import ProfilePanel from '../../components/ProfilePanel'
import { getTheme, saveTheme, applyTheme, ThemePreference } from '../../lib/theme'
import { getProfile, createProfile, getAvatarColor } from '../../lib/profile'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { getGradientStyle } from '../../lib/gradient'

const FOLDER_ZONE_RADIUS = 80

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [joinedAt, setJoinedAt] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>('system')
  const [searchQuery, setSearchQuery] = useState('')
  const [queue, setQueue] = useState<Track[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [morphingTrackIds, setMorphingTrackIds] = useState<string[]>([])
  const [newFolderId, setNewFolderId] = useState<string | null>(null)
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null)
  const [folderView, setFolderView] = useState<Folder | null>(null)
  const [folderTarget, setFolderTarget] = useState<string | null>(null)
  const [folderZoneActive, setFolderZoneActive] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playLoggedRef = useRef(false)
  const folderTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFolderTargetRef = useRef<string | null>(null)
  const gridLockedRef = useRef(false)
  const pendingStateRef = useRef<{ tracks: Track[] | null; folders: Folder[] | null }>({ tracks: null, folders: null })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
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
      setAvatarUrl(profile?.avatar_url ?? null)
      setJoinedAt(session.user.created_at ?? null)
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
    const prev = tracks.find(t => t.id === updated.id)
    const oldFolderId = prev?.folder_id ?? null
    const updatedFolderId = updated.folder_id ?? null
    setTracks(ts => ts.map(t => t.id === updated.id ? updated : t))
    if (activeTrack?.id === updated.id) setActiveTrack(updated)
    if (oldFolderId && oldFolderId !== updatedFolderId) {
      const remaining = tracks.filter(t => t.id !== updated.id && t.folder_id === oldFolderId)
      if (remaining.length === 0) autoDeleteFolder(oldFolderId)
    }
  }

  function handleTrackDeleted(trackId: string) {
    if (!trackId) { fetchTracks(); return }
    const prev = tracks.find(t => t.id === trackId)
    const folderId = prev?.folder_id ?? null
    setTracks(ts => ts.filter(t => t.id !== trackId))
    if (activeTrack?.id === trackId) {
      audioRef.current?.pause()
      setActiveTrack(null)
      setIsPlaying(false)
    }
    if (folderId) {
      const remaining = tracks.filter(t => t.id !== trackId && t.folder_id === folderId)
      if (remaining.length === 0) autoDeleteFolder(folderId)
    }
  }

  async function fetchTracks(uid?: string) {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', uid ?? userId)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (!error && data) {
      if (gridLockedRef.current) {
        pendingStateRef.current.tracks = data as Track[]
      } else {
        setTracks(data as Track[])
      }
    }
  }

  async function fetchFolders(uid?: string) {
    const { data } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', uid ?? userId)
      .order('created_at', { ascending: true })
    if (data) {
      if (gridLockedRef.current) {
        pendingStateRef.current.folders = data as Folder[]
      } else {
        setFolders(data as Folder[])
      }
    }
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

  async function autoDeleteFolder(folderId: string) {
    await supabase.from('folders').delete().eq('id', folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
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

  async function createFolderFromDrop(trackAId: string, trackBId: string) {
    gridLockedRef.current = true
    pendingStateRef.current = { tracks: null, folders: null }
    setMorphingTrackIds([trackAId, trackBId])

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      gridLockedRef.current = false
      setMorphingTrackIds([])
      return
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({ user_id: session.user.id, name: 'Untitled Folder' })
      .select()
      .single()

    if (!error && folder) {
      await Promise.all([
        Promise.all([
          supabase.from('tracks').update({ folder_id: folder.id }).eq('id', trackAId),
          supabase.from('tracks').update({ folder_id: folder.id }).eq('id', trackBId),
        ]),
        new Promise(r => setTimeout(r, 320)),
      ])

      await Promise.all([fetchFolders(), fetchTracks()])

      gridLockedRef.current = false
      const { tracks: pendingTracks, folders: pendingFolders } = pendingStateRef.current
      pendingStateRef.current = { tracks: null, folders: null }

      setNewFolderId(folder.id)
      if (pendingTracks) setTracks(pendingTracks)
      if (pendingFolders) setFolders(pendingFolders)
      setMorphingTrackIds([])

      setTimeout(() => setNewFolderId(null), 500)
    } else {
      gridLockedRef.current = false
      setMorphingTrackIds([])
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setFolderZoneActive(false)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over, active } = event
    if (!over || (over.id as string) === (active.id as string)) {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = null
      setFolderTarget(null)
      setFolderDropTargetId(null)
      setFolderZoneActive(false)
      return
    }
    const overId = over.id as string

    const isExistingFolder = folders.some(f => f.id === overId)
    if (isExistingFolder) {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = null
      setFolderTarget(null)
      setFolderDropTargetId(overId)
      setFolderZoneActive(false)
      return
    }
    setFolderDropTargetId(null)

    const isUnfolderedTrack = tracks.some(t => t.id === overId && !t.folder_id)
    if (isUnfolderedTrack) {
      const activeRect = active.rect.current.translated
      const overRect = over.rect
      const inFolderZone = activeRect
        ? Math.hypot(
            (activeRect.left + activeRect.width / 2) - (overRect.left + overRect.width / 2),
            (activeRect.top + activeRect.height / 2) - (overRect.top + overRect.height / 2)
          ) < FOLDER_ZONE_RADIUS
        : false
      setFolderZoneActive(inFolderZone)
      if (inFolderZone && pendingFolderTargetRef.current !== overId) {
        if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
        pendingFolderTargetRef.current = overId
        folderTargetTimerRef.current = setTimeout(() => setFolderTarget(overId), 400)
      } else if (!inFolderZone) {
        if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
        pendingFolderTargetRef.current = null
        setFolderTarget(null)
      }
    } else {
      if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
      pendingFolderTargetRef.current = null
      setFolderTarget(null)
      setFolderZoneActive(false)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const currentFolderTarget = folderTarget
    setActiveId(null)
    setFolderDropTargetId(null)
    setFolderTarget(null)
    setFolderZoneActive(false)
    const { active, over } = event
    if (folderTargetTimerRef.current) clearTimeout(folderTargetTimerRef.current)
    pendingFolderTargetRef.current = null

    if (!over || active.id === over.id) return

    const overId = over.id as string

    // Drop on existing folder → add track to it
    const targetFolder = folders.find(f => f.id === overId)
    if (targetFolder) {
      const trackId = active.id as string
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, folder_id: targetFolder.id } : t))
      supabase.from('tracks').update({ folder_id: targetFolder.id }).eq('id', trackId)
      return
    }

    // Hover intent confirmed (400ms) → create folder
    if (currentFolderTarget === overId) {
      createFolderFromDrop(active.id as string, overId)
      return
    }

    // No folder intent → reorder
    const oldIdx = tracks.findIndex(t => t.id === (active.id as string))
    const newIdx = tracks.findIndex(t => t.id === overId)
    if (oldIdx === -1 || newIdx === -1) return
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
          <button
            onClick={() => setShowProfile(true)}
            className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0 hover:ring-2 hover:ring-[var(--color-accent-ring)] transition-all"
            style={avatarUrl ? undefined : { backgroundColor: avatarColor }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
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
                    ownerDisplayName={displayName || undefined}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[var(--color-text-label)] text-xs uppercase tracking-widest mb-3">Folders</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      trackCount={tracks.filter(t => t.folder_id === folder.id).length}
                      folderTracks={tracks.filter(t => t.folder_id === folder.id)}
                      onClick={() => setFolderView(folder)}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                      isNew={newFolderId === folder.id}
                      isDropTarget={folderDropTargetId === folder.id}
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
                      isMorphing={morphingTrackIds.includes(track.id)}
                      isDragFrozen={folderZoneActive}
                      ownerDisplayName={displayName || undefined}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
            <DragOverlay dropAnimation={null}>
              {activeId ? (() => {
                const t = tracks.find(tr => tr.id === activeId)
                if (!t) return null
                return (
                  <div className="drag-overlay-card bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden" style={{ width: 180 }}>
                    <div className="w-full aspect-square relative" style={t.cover_url ? undefined : getGradientStyle(t.id)}>
                      {t.cover_url && <img src={t.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[var(--color-text-primary)] text-xs font-semibold truncate">{t.title.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                )
              })() : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {showProfile && userId && (
        <ProfilePanel
          userId={userId}
          email={userEmail ?? ''}
          displayName={displayName}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          joinedAt={joinedAt ?? undefined}
          onClose={() => setShowProfile(false)}
          onUpdated={({ displayName: name, avatarUrl: url }) => {
            if (name !== undefined) setDisplayName(name)
            if (url !== undefined) setAvatarUrl(url)
          }}
          onSignOut={async () => { await supabase.auth.signOut(); router.push('/login') }}
        />
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
          ownerDisplayName={displayName || undefined}
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
