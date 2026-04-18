'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Folder } from '../lib/types'

interface Props {
  folder: Folder
  trackCount: number
  onClick: () => void
  onRename: (folder: Folder, newName: string) => void
  onDelete: (folderId: string) => void
}

export default function FolderCard({ folder, trackCount, onClick, onRename, onDelete }: Props) {
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
      onClick={onClick}
      className="relative bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-accent-ring)] transition-all"
    >
      <div className="absolute top-2 right-2 z-20">
        <button ref={buttonRef} onClick={handleMenuClick} className="btn-chrome-circle">⋮</button>
      </div>

      <div
        className="w-full aspect-square flex items-center justify-center select-none"
        style={{ background: 'linear-gradient(135deg, rgba(180,120,40,0.22) 0%, rgba(120,80,20,0.12) 100%)' }}
      >
        <span className="text-5xl">📁</span>
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
