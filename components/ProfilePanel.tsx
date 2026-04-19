'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  email: string
  displayName: string
  avatarUrl: string | null
  avatarColor: string
  joinedAt?: string
  onClose: () => void
  onUpdated: (patch: { displayName?: string; avatarUrl?: string | null }) => void
  onSignOut: () => void
}

function formatJoinedDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}.${dd}.${yyyy}`
}

export default function ProfilePanel({ userId, email, displayName: initialName, avatarUrl: initialAvatarUrl, avatarColor, joinedAt, onClose, onUpdated, onSignOut }: Props) {
  const [displayName, setDisplayName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      setToast(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    if (profileError) {
      console.error('Profile avatar update error:', profileError)
      setToast(`Profile update failed: ${profileError.message}`)
      setUploading(false)
      return
    }
    setAvatarUrl(publicUrl)
    onUpdated({ avatarUrl: publicUrl })
    setToast('Avatar updated')
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    const trimmed = displayName.trim()
    if (!trimmed) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
    if (error) {
      console.error('Display name save error:', error)
      setToast(`Save failed: ${error.message}`)
      setSaving(false)
      return
    }
    onUpdated({ displayName: trimmed })
    setToast('Profile saved')
    setSaving(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 group cursor-pointer"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-2xl font-bold rounded-2xl"
                style={{ backgroundColor: avatarColor }}
              >
                {initialName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
              {uploading ? '…' : 'Change'}
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-gray-500 text-xs">Click avatar to change</p>
        </div>

        <div>
          <label className="text-[var(--color-text-label)] text-xs uppercase tracking-wide block mb-1.5">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-[var(--color-text-label)] text-xs uppercase tracking-wide block mb-1.5">Email</label>
          <p className="text-[var(--color-text-primary)] text-sm px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg opacity-60 select-none">{email}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="border-t border-[var(--color-border)] pt-3">
          <button
            onClick={onSignOut}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-surface)] rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>

        {joinedAt && (
          <p className="text-center text-[10px] text-gray-600 -mt-2 select-none">
            Joined {formatJoinedDate(joinedAt)}
          </p>
        )}

        {toast && (
          <p className="text-center text-xs text-purple-400 -mt-2">{toast}</p>
        )}
      </div>
    </div>,
    document.body
  )
}
