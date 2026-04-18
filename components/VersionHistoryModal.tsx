'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { Track, TrackVersion } from '../lib/types'

interface Props {
  track: Track
  onClose: () => void
  onVersionActivated: (updatedTrack: Track) => void
}

export default function VersionHistoryModal({ track, onClose, onVersionActivated }: Props) {
  const [versions, setVersions] = useState<TrackVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('track_versions')
        .select('*')
        .eq('track_id', track.id)
        .order('version_number', { ascending: false })
      setVersions((data as TrackVersion[]) ?? [])
      setLoading(false)
    }
    load()
  }, [track.id])

  async function handleActivate(version: TrackVersion) {
    if (version.is_active) return
    setActivating(version.id)
    await supabase.from('track_versions').update({ is_active: false }).eq('track_id', track.id)
    await supabase.from('track_versions').update({ is_active: true }).eq('id', version.id)
    await supabase.from('tracks').update({ file_path: version.file_path }).eq('id', track.id)
    setVersions(prev => prev.map(v => ({ ...v, is_active: v.id === version.id })))
    setActivating(null)
    onVersionActivated({ ...track, file_path: version.file_path })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      onClick={e => { e.stopPropagation(); onClose() }}
    >
      <div
        className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-4 truncate">
          Version History — {track.title}
        </h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : versions.length === 0 ? (
          <p className="text-gray-500 text-sm">No versions found.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {versions.map(v => (
              <li key={v.id} className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[var(--color-text-primary)] text-sm font-medium">
                    v{v.version_number}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                  {v.is_active && (
                    <span className="ml-2 text-xs text-purple-400 font-medium">active</span>
                  )}
                </div>
                {!v.is_active && (
                  <button
                    onClick={() => handleActivate(v)}
                    disabled={activating === v.id}
                    className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    {activating === v.id ? '...' : 'Restore'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="w-full bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}
