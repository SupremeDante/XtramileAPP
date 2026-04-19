'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDroppable } from '@dnd-kit/core'
import { Folder, Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  folder: Folder
  trackCount: number
  folderTracks?: Track[]
  onClick: () => void
  onRename: (folder: Folder, newName: string) => void
  onDelete: (folderId: string) => void
  isNew?: boolean
  isDropTarget?: boolean
}

export default function FolderCard({ folder, trackCount, folderTracks = [], onClick, onRename, onDelete, isNew, isDropTarget }: Props) {
  const { setNodeRef } = useDroppable({ id: folder.id })
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const buttonRef = useRef<HTMLButtonElement>(null)

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 })
    }
    setMenuOpen(true)
  }

  function handleRenameClick(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    setNewName(folder.name)
    setRenaming(true)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete(folder.id)
  }

  function handleConfirmRename() {
    const trimmed = newName.trim()
    if (trimmed && trimmed !== folder.name) onRename(folder, trimmed)
    setRenaming(false)
  }

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`relative bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-accent-ring)] transition-all ${isNew ? 'folder-morph-in' : ''} ${isDropTarget ? 'folder-drop-target-card' : ''}`}
    >
      <div className="absolute top-2 right-2 z-20">
        <button ref={buttonRef} onClick={handleMenuClick} className="btn-chrome-circle">⋮</button>
      </div>

      <div
        className="w-full aspect-square relative select-none overflow-hidden"
        style={{ background: '#0d0d0d' }}
      >
        {isDropTarget ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/10 backdrop-blur-sm">
            <span className="text-5xl">📂</span>
            <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-0.5 rounded-full">Add to folder</span>
          </div>
        ) : folderTracks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(80,80,80,0.22) 0%, rgba(40,40,40,0.12) 100%)' }}>
            <span className="text-5xl">📁</span>
          </div>
        ) : folderTracks.length === 1 ? (
          <div
            className="absolute inset-0"
            style={!folderTracks[0].cover_url ? getGradientStyle(folderTracks[0].id) : { background: '#1a1a1a' }}
          >
            {folderTracks[0].cover_url && (
              <img src={folderTracks[0].cover_url} alt={folderTracks[0].title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            )}
          </div>
        ) : folderTracks.length <= 4 ? (
          <div className="absolute inset-0 p-[1.5px] grid grid-cols-2 gap-[1.5px]">
            {folderTracks.slice(0, 4).map(track => (
              <div
                key={track.id}
                className="relative rounded-md overflow-hidden"
                style={!track.cover_url ? getGradientStyle(track.id) : { background: '#1a1a1a' }}
              >
                {track.cover_url && (
                  <img src={track.cover_url} alt={track.title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={!folderTracks[0].cover_url ? getGradientStyle(folderTracks[0].id) : { background: '#1a1a1a' }}
            >
              {folderTracks[0].cover_url && (
                <img src={folderTracks[0].cover_url} alt={folderTracks[0].title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              )}
            </div>
            <div className="absolute bottom-2 right-2">
              <span className="bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {trackCount} tracks
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{folder.name}</p>
        <p className="text-gray-500 text-xs mt-1">{trackCount} track{trackCount !== 1 ? 's' : ''}</p>
      </div>

      {menuOpen && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div
            className="fixed z-50 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl py-1 w-44"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={handleRenameClick} className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors">Rename</button>
            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              <button onClick={handleDeleteClick} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-surface)] transition-colors">Delete Folder</button>
            </div>
          </div>
        </>,
        document.body
      )}

      {renaming && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={e => { e.stopPropagation(); setRenaming(false) }}
        >
          <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-6 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[var(--color-text-primary)] text-base font-semibold mb-3">Rename Folder</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
              autoFocus
              className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border-input)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-purple-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRenaming(false)} className="flex-1 bg-[var(--color-bg-cancel)] hover:bg-[var(--color-bg-cancel-hov)] text-[var(--color-text-primary)] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleConfirmRename} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm">Rename</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
