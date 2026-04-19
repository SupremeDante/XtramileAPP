# Folder Cover Art Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `FolderCard` so the thumbnail displays track cover art as a dynamic tile grid — 1 track = full-bleed, 2–4 tracks = 2×2 grid, 5+ tracks = first track full-bleed with a count badge.

**Architecture:** Single component change to `components/FolderCard.tsx`. A new `onTrackClick` prop is added for individual tile interaction. `app/tracks/page.tsx` gets one line added to pass the existing `handleTrackClick` handler down. No data model changes.

**Tech Stack:** React 19, Next.js, TypeScript, Tailwind CSS v4, `@dnd-kit/core`, React Testing Library + Jest

---

## File Map

| File | Change |
|------|--------|
| `components/FolderCard.tsx` | Replace grid rendering logic; add `onTrackClick` prop |
| `components/__tests__/FolderCard.test.tsx` | New test file |
| `app/tracks/page.tsx` | Pass `onTrackClick={handleTrackClick}` to `<FolderCard>` |

---

### Task 1: Write failing tests for FolderCard

**Files:**
- Create: `components/__tests__/FolderCard.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FolderCard from '../FolderCard'
import { Folder, Track } from '../../lib/types'

const folder: Folder = {
  id: 'folder1',
  user_id: 'user1',
  name: 'My Beats',
  created_at: '2026-01-01T00:00:00Z',
}

const makeTrack = (id: string, cover_url?: string): Track => ({
  id,
  user_id: 'user1',
  title: `Track ${id}`,
  file_path: `user1/${id}.mp3`,
  uploader_email: 'user@example.com',
  created_at: '2026-01-01T00:00:00Z',
  cover_url: cover_url ?? null,
})

const baseProps = {
  folder,
  trackCount: 0,
  folderTracks: [],
  onClick: jest.fn(),
  onRename: jest.fn(),
  onDelete: jest.fn(),
  onTrackClick: jest.fn(),
}

it('renders the folder name', () => {
  render(<FolderCard {...baseProps} />)
  expect(screen.getByText('My Beats')).toBeInTheDocument()
})

it('shows emoji placeholder when folder is empty', () => {
  render(<FolderCard {...baseProps} />)
  expect(screen.getByText('📁')).toBeInTheDocument()
})

it('renders a single cover image when folder has 1 track with cover_url', () => {
  const tracks = [makeTrack('t1', 'https://example.com/cover1.jpg')]
  render(<FolderCard {...baseProps} trackCount={1} folderTracks={tracks} />)
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/cover1.jpg')
})

it('calls onTrackClick when a single tile is clicked', async () => {
  const onTrackClick = jest.fn()
  const tracks = [makeTrack('t1', 'https://example.com/cover1.jpg')]
  render(<FolderCard {...baseProps} trackCount={1} folderTracks={tracks} onTrackClick={onTrackClick} />)
  await userEvent.click(screen.getByRole('img'))
  expect(onTrackClick).toHaveBeenCalledWith(tracks[0])
})

it('does not call folder onClick when a tile is clicked', async () => {
  const onClick = jest.fn()
  const tracks = [makeTrack('t1', 'https://example.com/cover1.jpg')]
  render(<FolderCard {...baseProps} trackCount={1} folderTracks={tracks} onClick={onClick} />)
  await userEvent.click(screen.getByRole('img'))
  expect(onClick).not.toHaveBeenCalled()
})

it('renders 4 tiles when folder has 4 tracks', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/c1.jpg'),
    makeTrack('t2', 'https://example.com/c2.jpg'),
    makeTrack('t3', 'https://example.com/c3.jpg'),
    makeTrack('t4', 'https://example.com/c4.jpg'),
  ]
  render(<FolderCard {...baseProps} trackCount={4} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')).toHaveLength(4)
})

it('shows full-bleed first track cover with badge when folder has 5+ tracks', () => {
  const tracks = Array.from({ length: 6 }, (_, i) =>
    makeTrack(`t${i}`, `https://example.com/c${i}.jpg`)
  )
  render(<FolderCard {...baseProps} trackCount={6} folderTracks={tracks} />)
  const imgs = screen.getAllByRole('img')
  expect(imgs).toHaveLength(1)
  expect(imgs[0]).toHaveAttribute('src', 'https://example.com/c0.jpg')
  expect(screen.getByText('6 tracks')).toBeInTheDocument()
})

it('shows drop target overlay when isDropTarget is true', () => {
  render(<FolderCard {...baseProps} isDropTarget />)
  expect(screen.getByText('Add to folder')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest components/__tests__/FolderCard.test.tsx --no-coverage
```

Expected output: multiple failures — `onTrackClick` prop doesn't exist yet, grid logic doesn't match.

- [ ] **Step 3: Commit failing tests**

```bash
git add components/__tests__/FolderCard.test.tsx
git commit -m "test: add failing tests for FolderCard cover grid"
```

---

### Task 2: Update FolderCard component

**Files:**
- Modify: `components/FolderCard.tsx`

- [ ] **Step 1: Add `onTrackClick` to the Props interface**

In `components/FolderCard.tsx`, replace the `Props` interface:

```tsx
interface Props {
  folder: Folder
  trackCount: number
  folderTracks?: Track[]
  onClick: () => void
  onRename: (folder: Folder, newName: string) => void
  onDelete: (folderId: string) => void
  onTrackClick: (track: Track) => void
  isNew?: boolean
  isDropTarget?: boolean
}
```

Also update the destructured parameter line:

```tsx
export default function FolderCard({ folder, trackCount, folderTracks = [], onClick, onRename, onDelete, onTrackClick, isNew, isDropTarget }: Props) {
```

- [ ] **Step 2: Replace the image area rendering logic**

Find the `<div className="w-full aspect-square relative select-none overflow-hidden" ...>` block (lines 66–102) and replace its inner content with:

```tsx
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
      className="absolute inset-0 cursor-pointer hover:brightness-110 transition-all"
      style={!folderTracks[0].cover_url ? getGradientStyle(folderTracks[0].id) : { background: '#1a1a1a' }}
      onClick={e => { e.stopPropagation(); onTrackClick(folderTracks[0]) }}
    >
      {folderTracks[0].cover_url && (
        <img src={folderTracks[0].cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      )}
    </div>
  ) : folderTracks.length <= 4 ? (
    <div className="absolute inset-0 p-[1.5px] grid grid-cols-2 gap-[1.5px]">
      {folderTracks.slice(0, 4).map(track => (
        <div
          key={track.id}
          className="relative overflow-hidden cursor-pointer hover:brightness-110 transition-all"
          style={!track.cover_url ? getGradientStyle(track.id) : { background: '#1a1a1a' }}
          onClick={e => { e.stopPropagation(); onTrackClick(track) }}
        >
          {track.cover_url && (
            <img src={track.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
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
          <img src={folderTracks[0].cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
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
```

- [ ] **Step 3: Run tests — confirm they pass**

```bash
npx jest components/__tests__/FolderCard.test.tsx --no-coverage
```

Expected: all 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/FolderCard.tsx
git commit -m "feat: update FolderCard to show cover art grid (1=full, 2-4=grid, 5+=hero)"
```

---

### Task 3: Wire up `onTrackClick` in page.tsx

**Files:**
- Modify: `app/tracks/page.tsx`

- [ ] **Step 1: Add `onTrackClick` prop to the FolderCard usage**

Find the `<FolderCard` block in `app/tracks/page.tsx` (around line 538). Add one prop:

```tsx
<FolderCard
  key={folder.id}
  folder={folder}
  trackCount={tracks.filter(t => t.folder_id === folder.id).length}
  folderTracks={tracks.filter(t => t.folder_id === folder.id)}
  onClick={() => setFolderView(folder)}
  onRename={handleRenameFolder}
  onDelete={handleDeleteFolder}
  onTrackClick={handleTrackClick}
  isNew={newFolderId === folder.id}
  isDropTarget={folderDropTargetId === folder.id}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/tracks/page.tsx
git commit -m "feat: wire onTrackClick into FolderCard from page"
```

---

## Self-Review

**Spec coverage:**
- ✅ 0 tracks → emoji placeholder
- ✅ 1 track → full-bleed tile, clickable
- ✅ 2–4 tracks → 2×2 grid, each tile clickable, stopPropagation
- ✅ 5+ tracks → first track full-bleed + count badge
- ✅ Drop target overlay unchanged
- ✅ Gradient fallback for missing cover_url
- ✅ Square container + rounded corners (existing, untouched)
- ✅ Hover brightness feedback on tiles
- ✅ Folder card onClick (label area) still navigates to folder view

**Placeholder scan:** None found.

**Type consistency:** `onTrackClick: (track: Track) => void` defined in Props (Task 2, Step 1), used in JSX (Task 2, Step 2), and passed as `handleTrackClick` (Task 3, Step 1) — all consistent.
