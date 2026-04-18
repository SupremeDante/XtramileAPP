'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Meyda from 'meyda'
import { supabase } from '../lib/supabase'
import { Track } from '../lib/types'
import { withUploadProgress } from '../lib/uploadProgress'
import VersionHistoryModal from './VersionHistoryModal'

interface Props {
  track: Track
  onDeleted: (trackId: string) => void
  onTrackUpdated: (track: Track) => void
  onAddToQueue?: (track: Track) => void
}

type TrackWithNotes = Track & { notes?: string }

interface InsightsData {
  title: string
  uploader_email: string
  bpm: number | null
  key: string | null
  created_at: string
}

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pearson(a: number[], b: number[]): number {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

function detectKey(chroma: number[]): string {
  let best = -Infinity
  let bestKey = 'C major'
  for (let r = 0; r < 12; r++) {
    const rotated = [...chroma.slice(r), ...chroma.slice(0, r)]
    const mj = pearson(rotated, MAJOR_PROFILE)
    const mn = pearson(rotated, MINOR_PROFILE)
    if (mj > best) { best = mj; bestKey = `${NOTE_NAMES[r]} major` }
    if (mn > best) { best = mn; bestKey = `${NOTE_NAMES[r]} minor` }
  }
  return bestKey
}

async function analyzeAudio(blob: Blob): Promise<{ bpm: number | null; key: string | null }> {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  const data = audioBuffer.getChannelData(0)
  const sr = audioBuffer.sampleRate
  const RMS_HOP = 512

  // Build RMS envelope via meyda
  const rmsValues: number[] = []
  for (let i = 0; i + RMS_HOP <= data.length; i += RMS_HOP) {
    const frame = data.subarray(i, i + RMS_HOP)
    const f = Meyda.extract(['rms'], Array.from(frame)) as { rms: number } | null
    rmsValues.push(f?.rms ?? 0)
  }

  // Onset strength = positive RMS delta
  const onset: number[] = [0]
  for (let i = 1; i < rmsValues.length; i++) {
    onset.push(Math.max(0, rmsValues[i] - rmsValues[i - 1]))
  }

  // Autocorrelation over 60–180 BPM lag range
  const fps = sr / RMS_HOP
  const minLag = Math.floor(fps * 60 / 180)
  const maxLag = Math.floor(fps * 60 / 60)
  let bestCorr = -Infinity
  let bestLag = Math.round((minLag + maxLag) / 2)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i + lag < onset.length; i++) corr += onset[i] * onset[i + lag]
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }
  const rawBpm = fps * 60 / bestLag
  const bpm = rawBpm >= 60 && rawBpm <= 180 ? Math.round(rawBpm) : null

  // Accumulate chroma across frames via meyda
  const CHROMA_SIZE = 4096
  const chroma = new Array(12).fill(0)
  let chromaCount = 0
  for (let i = 0; i + CHROMA_SIZE <= data.length; i += CHROMA_SIZE * 4) {
    const frame = data.subarray(i, i + CHROMA_SIZE)
    const f = Meyda.extract(['chroma'], Array.from(frame)) as { chroma: number[] } | null
    if (f?.chroma) {
      f.chroma.forEach((v, j) => { chroma[j] += v })
      chromaCount++
    }
  }
  const key = chromaCount > 0
    ? detectKey(chroma.map(v => v / chromaCount))
    : null

  return { bpm, key }
}

export default function TrackMenu({ track, onDeleted, onTrackUpdated, onAddToQueue }: Props) {
  const t = track as TrackWithNotes

  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(t.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [editBpm, setEditBpm] = useState('')
  const [editKey, setEditKey] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showMove, setShowMove] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [moveFolders, setMoveFolders] = useState<{ id: string; name: string }[]>([])
  const [loadingMove, setLoadingMove] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsOffline(localStorage.getItem(`offline_track_${track.id}`) !== null)
  }, [track.id])

  useEffect(() => {
    if (!toastMessage) return
    const id = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(id)
  }, [toastMessage])

  useEffect(() => {
    if (!insightsData) return
    setEditBpm(insightsData.bpm?.toString() ?? '')
    setEditKey(insightsData.key ?? '')
  }, [insightsData])

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 })
    }
    setOpen(true)
  }

  function closeMenu() { setOpen(false) }

  function handleReplaceAudio(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const newPath = `${track.user_id}/${Date.now()}-${safeName}`
    try {
      await withUploadProgress((msg) => setToastMessage(msg), 'Uploading audio', async () => {
        const { error: uploadError } = await supabase.storage.from('audio').upload(newPath, file)
        if (uploadError) throw new Error('Upload failed')

        const { data: versions } = await supabase
          .from('track_versions')
          .select('version_number')
          .eq('track_id', track.id)
          .order('version_number', { ascending: false })
          .limit(1)
        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1

        await supabase.from('track_versions').update({ is_active: false }).eq('track_id', track.id)
        await supabase.from('track_versions').insert({
          track_id: track.id,
          version_number: nextVersion,
          file_path: newPath,
          is_active: true,
        })
        await supabase.from('tracks').update({ file_path: newPath }).eq('id', track.id)
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      onDeleted('')
    } catch {
      setToastMessage('Upload failed')
    }
  }

  function handleNotes(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    setShowNotes(true)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    await supabase.from('tracks').update({ notes }).eq('id', track.id)
    setSavingNotes(false)
    setShowNotes(false)
  }

  async function handleExport(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    const { data, error } = await supabase.storage.from('audio').download(track.file_path)
    if (error || !data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    const ext = track.file_path.split('.').pop() ?? 'mp3'
    a.download = `${track.title}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    await supabase.from('tracks').insert({
      user_id: track.user_id,
      title: `${track.title} (copy)`,
      file_path: track.file_path,
      uploader_email: track.uploader_email,
      bpm: track.bpm ?? null,
      key: track.key ?? null,
    })
    onDeleted('')
  }

  async function handleInsights(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    setLoadingInsights(true)
    setShowInsights(true)
    const { data } = await supabase
      .from('tracks')
      .select('title, uploader_email, bpm, key, created_at')
      .eq('id', track.id)
      .single()
    setInsightsData(data ?? null)
    setLoadingInsights(false)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    const { data: blob, error } = await supabase.storage.from('audio').download(track.file_path)
    if (error || !blob) { setAnalyzing(false); return }
    const { bpm, key } = await analyzeAudio(blob)
    if (bpm) setEditBpm(bpm.toString())
    if (key) setEditKey(key)
    setAnalyzing(false)
  }

  async function handleSaveMeta() {
    setSavingMeta(true)
    const parsed = parseInt(editBpm.trim(), 10)
    const bpmVal = editBpm.trim() && !isNaN(parsed) ? parsed : null
    await supabase.from('tracks').update({
      bpm: bpmVal,
      key: editKey.trim() || null,
    }).eq('id', track.id)
    setSavingMeta(false)
    setToastMessage('Track info saved')
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(track.file_path)
    try {
      const response = await fetch(publicUrl)
      const cache = await caches.open('xtramile-offline')
      await cache.put(publicUrl, response)
      localStorage.setItem(`offline_track_${track.id}`, publicUrl)
      setIsOffline(true)
      setToastMessage('Saved for offline playback')
    } catch {
      setToastMessage('Failed to save for offline')
    }
  }

  async function handleRemoveDownload(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(track.file_path)
    try {
      const cache = await caches.open('xtramile-offline')
      await cache.delete(publicUrl)
    } catch {}
    localStorage.removeItem(`offline_track_${track.id}`)
    setIsOffline(false)
    setToastMessage('Removed from offline storage')
  }

  function handleAddToQueue(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    onAddToQueue?.(track)
    setToastMessage(`Added to queue: ${track.title}`)
  }

  function handleChangeCover(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    coverInputRef.current?.click()
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${track.user_id}/${track.id}-${Date.now()}-${safeName}`
    try {
      await withUploadProgress((msg) => setToastMessage(msg), 'Uploading cover', async () => {
        const { error: uploadError } = await supabase.storage.from('covers').upload(path, file)
        if (uploadError) throw new Error(uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
        const { error: updateError } = await supabase.from('tracks').update({ cover_url: publicUrl }).eq('id', track.id)
        if (updateError) throw new Error('Failed to save cover')
      })
      if (coverInputRef.current) coverInputRef.current.value = ''
      onDeleted('')
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Cover upload failed')
    }
  }

  async function handleRemoveCover(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    const { error } = await supabase.from('tracks').update({ cover_url: null }).eq('id', track.id)
    if (error) { setToastMessage('Failed to remove cover'); return }
    onDeleted('')
    setToastMessage('Cover removed')
  }

  function handleVersionHistory(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    setShowVersionHistory(true)
  }

  async function handleMove(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()
    setLoadingMove(true)
    setShowMove(true)
    const { data } = await supabase
      .from('folders')
      .select('id, name')
      .eq('user_id', track.user_id)
      .order('created_at', { ascending: true })
    setMoveFolders(data ?? [])
    setLoadingMove(false)
  }

  async function handleMoveToFolder(folderId: string | null) {
    const { error } = await supabase.from('tracks').update({ folder_id: folderId }).eq('id', track.id)
    if (error) { setToastMessage('Failed to move track'); return }
    setShowMove(false)
    setToastMessage(folderId ? 'Track moved to folder' : 'Track removed from folder')
    onTrackUpdated({ ...track, folder_id: folderId })
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    closeMenu()

    try {
      await supabase.storage.from('audio').remove([track.file_path])
    } catch {}

    const { error } = await supabase.from('tracks').delete().eq('id', track.id)
    if (error) {
      setToastMessage('Failed to delete track')
      return
    }
    onDeleted(track.id)
  }

  const itemClass = 'w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors'

  return (
    <>
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />

      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white text-xs leading-none"
      >
        ⋮
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); closeMenu() }} />
          <div
            className="fixed z-50 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl py-1 w-44"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={handleReplaceAudio} className={itemClass}>Replace Audio</button>
            <button onClick={handleNotes} className={itemClass}>Notes</button>
            <button onClick={handleExport} className={itemClass}>Export Audio</button>
            <button onClick={handleDuplicate} className={itemClass}>Duplicate</button>
            <button onClick={handleInsights} className={itemClass}>Insights</button>
            <button onClick={handleAddToQueue} className={itemClass}>Add to Queue</button>
            {isOffline ? (
              <button onClick={handleRemoveDownload} className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-[var(--color-bg-surface)] transition-colors">
                Remove Download ✓
              </button>
            ) : (
              <button onClick={handleDownload} className={itemClass}>Download</button>
            )}
            <button onClick={handleChangeCover} className={itemClass}>Change Cover</button>
            {track.cover_url && (
              <button onClick={handleRemoveCover} className={itemClass}>Remove Cover</button>
            )}
            <button onClick={handleMove} className={itemClass}>Move</button>
            <button onClick={handleVersionHistory} className={itemClass}>Version History</button>
            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-surface)] transition-colors">Delete</button>
            </div>
          </div>
        </>,
        document.body
      )}

      {showNotes && createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={e => { e.stopPropagation(); setShowNotes(false) }}>
          <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-3 truncate">{track.title} — Notes</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes for this track..."
              rows={6}
              className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowNotes(false)} className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSaveNotes} disabled={savingNotes} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showInsights && createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={e => { e.stopPropagation(); setShowInsights(false) }}>
          <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-4 truncate">{track.title} — Insights</h2>
            {loadingInsights ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : insightsData ? (
              <>
                <dl className="space-y-3 mb-5">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 text-sm">Uploaded by</dt>
                    <dd className="text-[var(--color-text-primary)] text-sm">{insightsData.uploader_email.split('@')[0]}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 text-sm">Date added</dt>
                    <dd className="text-[var(--color-text-primary)] text-sm">{new Date(insightsData.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">BPM</label>
                    <input
                      type="number"
                      value={editBpm}
                      onChange={e => setEditBpm(e.target.value)}
                      placeholder="Not set"
                      className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-1.5 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Key</label>
                    <input
                      type="text"
                      value={editKey}
                      onChange={e => setEditKey(e.target.value)}
                      placeholder="Not set"
                      className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-1.5 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <button onClick={handleAnalyze} disabled={analyzing} className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] disabled:opacity-50 text-[var(--color-text-primary)] py-2 rounded-lg text-sm">
                    {analyzing ? 'Analyzing...' : 'Analyze Audio'}
                  </button>
                  <button onClick={handleSaveMeta} disabled={savingMeta} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                    {savingMeta ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Could not load track data.</p>
            )}
            <button onClick={() => setShowInsights(false)} className="w-full bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm">Close</button>
          </div>
        </div>,
        document.body
      )}

      {showMove && createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={e => { e.stopPropagation(); setShowMove(false) }}>
          <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-4 truncate">Move — {track.title}</h2>
            {loadingMove ? (
              <p className="text-gray-500 text-sm">Loading folders...</p>
            ) : moveFolders.length === 0 ? (
              <p className="text-gray-500 text-sm">No folders yet. Create one by dragging a track onto another.</p>
            ) : (
              <ul className="space-y-1 mb-4">
                {moveFolders.map(f => (
                  <li key={f.id}>
                    <button
                      onClick={() => handleMoveToFolder(f.id)}
                      className={`${itemClass} rounded-lg ${track.folder_id === f.id ? 'text-purple-400' : ''}`}
                    >
                      📁 {f.name}{track.folder_id === f.id ? ' ✓' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {track.folder_id && (
              <button onClick={() => handleMoveToFolder(null)} className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-[var(--color-bg-surface)] rounded-lg transition-colors mb-2">
                Remove from folder
              </button>
            )}
            <button onClick={() => setShowMove(false)} className="w-full bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm mt-1">Cancel</button>
          </div>
        </div>,
        document.body
      )}

      {showVersionHistory && (
        <VersionHistoryModal
          track={track}
          onClose={() => setShowVersionHistory(false)}
          onVersionActivated={updated => { setShowVersionHistory(false); onTrackUpdated(updated) }}
        />
      )}

      {toastMessage && createPortal(
        <div className="fixed bottom-28 right-4 z-50 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-4 py-2.5 rounded-xl shadow-xl max-w-xs">
          {toastMessage}
        </div>,
        document.body
      )}
    </>
  )
}
