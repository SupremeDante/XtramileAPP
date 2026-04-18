'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { withUploadProgress } from '../lib/uploadProgress'

interface Props {
  onClose: () => void
  onUploaded: () => void
  userEmail: string
}

export default function UploadModal({ onClose, onUploaded, userEmail }: Props) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploadPct, setUploadPct] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isUploading = uploadMsg !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) {
      setError('Title and audio file are required.')
      return
    }
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated.'); return }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${session.user.id}/${Date.now()}-${safeName}`

    try {
      await withUploadProgress(
        (msg, pct) => { setUploadMsg(msg); setUploadPct(pct) },
        'Uploading audio',
        async () => {
          const { error: uploadError } = await supabase.storage.from('audio').upload(filePath, file)
          if (uploadError) throw new Error(uploadError.message)

          const { data: trackData, error: insertError } = await supabase
            .from('tracks')
            .insert({
              title: title.trim(),
              file_path: filePath,
              user_id: session.user.id,
              uploader_email: userEmail,
            })
            .select('id')
            .single()
          if (insertError || !trackData) throw new Error(insertError?.message ?? 'Insert failed')

          await supabase.from('track_versions').insert({
            track_id: trackData.id,
            version_number: 1,
            file_path: filePath,
            is_active: true,
          })
        }
      )
      await new Promise(r => setTimeout(r, 1000))
      onUploaded()
    } catch (err) {
      setUploadMsg('')
      setUploadPct(0)
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[var(--color-text-primary)] text-lg font-semibold mb-4">Upload Track</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Audio File</label>
            <input
              type="file"
              accept="audio/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-gray-400 text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {isUploading && (
            <div>
              <p className="text-gray-400 text-xs mb-1.5">{uploadMsg}</p>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] disabled:opacity-50 text-[var(--color-text-primary)] py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
