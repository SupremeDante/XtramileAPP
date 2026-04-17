'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onUploaded: () => void
  userEmail: string
}

export default function UploadModal({ onClose, onUploaded, userEmail }: Props) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) {
      setError('Title and audio file are required.')
      return
    }
    setUploading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated.'); setUploading(false); return }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${session.user.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('audio').upload(filePath, file)
    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { error: insertError } = await supabase.from('tracks').insert({
      title: title.trim(),
      file_path: filePath,
      user_id: session.user.id,
      uploader_email: userEmail,
    })
    if (insertError) { setError(insertError.message); setUploading(false); return }

    setUploading(false)
    onUploaded()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e30] rounded-2xl p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">Upload Track</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full bg-[#0f0f1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#333] hover:bg-[#444] text-white py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
