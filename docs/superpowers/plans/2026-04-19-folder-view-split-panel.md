# Folder View Split Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat folder view grid with a split-panel layout (large cover left, track list right) and make folder cards pure navigation elements with no tile-level playback.

**Architecture:** Three targeted file changes: `FolderCard.tsx` loses `onTrackClick` and tile interactivity; a new `FolderView.tsx` component owns the split-panel UI with local `selectedTrackId` state; `page.tsx` swaps the inline folder view block for `<FolderView>` and drops `onTrackClick` from `<FolderCard>`.

**Tech Stack:** React 19, Next.js, TypeScript, Tailwind CSS v4, React Testing Library + Jest

---

## File Map

| File | Change |
|------|--------|
| `components/FolderCard.tsx` | Remove `onTrackClick` prop and tile click handlers |
| `components/__tests__/FolderCard.test.tsx` | Remove `onTrackClick` from baseProps and delete tile-click tests |
| `components/FolderView.tsx` | New split-panel folder view component |
| `components/__tests__/FolderView.test.tsx` | New test file |
| `app/tracks/page.tsx` | Import FolderView, replace inline folder view block, remove `onTrackClick` from `<FolderCard>` |

---

### Task 1: Remove onTrackClick from FolderCard

**Files:**
- Modify: `components/FolderCard.tsx`
- Modify: `components/__tests__/FolderCard.test.tsx`

- [ ] **Step 1: Update FolderCard.test.tsx — remove onTrackClick prop and tile-click tests**

Replace the entire contents of `components/__tests__/FolderCard.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
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
}

beforeEach(() => jest.clearAllMocks())

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

it('renders 2 tiles when folder has 2 tracks', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/c1.jpg'),
    makeTrack('t2', 'https://example.com/c2.jpg'),
  ]
  render(<FolderCard {...baseProps} trackCount={2} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')).toHaveLength(2)
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
  expect(screen.getAllByText('6 tracks')).toHaveLength(2)
})

it('shows drop target overlay when isDropTarget is true', () => {
  render(<FolderCard {...baseProps} isDropTarget />)
  expect(screen.getByText('Add to folder')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests — confirm they pass**

```bash
npx jest components/__tests__/FolderCard.test.tsx --no-coverage
```

Expected: all 7 tests pass. (`onTrackClick` is still optional on the component so nothing breaks yet.)

- [ ] **Step 3: Update FolderCard.tsx — remove onTrackClick prop and tile handlers**

In `components/FolderCard.tsx`, make three changes:

**Replace the Props interface:**
```tsx
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
```

**Replace the function signature (remove `onTrackClick` from destructuring):**
```tsx
export default function FolderCard({ folder, trackCount, folderTracks = [], onClick, onRename, onDelete, isNew, isDropTarget }: Props) {
```

**Replace the 1-track tile (the `folderTracks.length === 1` branch):**
```tsx
) : folderTracks.length === 1 ? (
  <div
    className="absolute inset-0"
    style={!folderTracks[0].cover_url ? getGradientStyle(folderTracks[0].id) : { background: '#1a1a1a' }}
  >
    {folderTracks[0].cover_url && (
      <img src={folderTracks[0].cover_url} alt={folderTracks[0].title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
    )}
  </div>
```

**Replace the 2–4 tile grid (the `folderTracks.length <= 4` branch):**
```tsx
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
```

- [ ] **Step 4: Run tests — confirm they still pass**

```bash
npx jest components/__tests__/FolderCard.test.tsx --no-coverage
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/FolderCard.tsx components/__tests__/FolderCard.test.tsx
git commit -m "feat: remove onTrackClick from FolderCard — cards are navigation-only"
```

---

### Task 2: Write failing tests for FolderView

**Files:**
- Create: `components/__tests__/FolderView.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FolderView from '../FolderView'
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
  folderTracks: [],
  activeTrack: null,
  onTrackClick: jest.fn(),
  onBack: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

it('renders the back button', () => {
  render(<FolderView {...baseProps} />)
  expect(screen.getByText('← Back')).toBeInTheDocument()
})

it('calls onBack when back button is clicked', async () => {
  render(<FolderView {...baseProps} />)
  await userEvent.click(screen.getByText('← Back'))
  expect(baseProps.onBack).toHaveBeenCalledTimes(1)
})

it('shows empty state when folder has no tracks', () => {
  render(<FolderView {...baseProps} />)
  expect(screen.getByText('This folder is empty.')).toBeInTheDocument()
})

it('renders all track titles in the list', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2'), makeTrack('t3')]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  expect(screen.getByText('Track t1')).toBeInTheDocument()
  expect(screen.getByText('Track t2')).toBeInTheDocument()
  expect(screen.getByText('Track t3')).toBeInTheDocument()
})

it('shows the first track cover in the left panel by default', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/cover1.jpg'),
    makeTrack('t2', 'https://example.com/cover2.jpg'),
  ]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'https://example.com/cover1.jpg')
})

it('calls onTrackClick when a track row is clicked', async () => {
  const onTrackClick = jest.fn()
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} onTrackClick={onTrackClick} />)
  await userEvent.click(screen.getByText('Track t2'))
  expect(onTrackClick).toHaveBeenCalledWith(tracks[1])
})

it('updates the left panel cover when a track row is clicked', async () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/cover1.jpg'),
    makeTrack('t2', 'https://example.com/cover2.jpg'),
  ]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  await userEvent.click(screen.getByText('Track t2'))
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'https://example.com/cover2.jpg')
})

it('applies active ring to the currently playing track row', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} activeTrack={tracks[0]} />)
  expect(screen.getByText('Track t1').closest('button')).toHaveClass('ring-2')
})

it('does not apply active ring to a non-playing track row', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} activeTrack={tracks[0]} />)
  expect(screen.getByText('Track t2').closest('button')).not.toHaveClass('ring-2')
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest components/__tests__/FolderView.test.tsx --no-coverage
```

Expected: all 9 tests fail with `Cannot find module '../FolderView'`.

- [ ] **Step 3: Commit**

```bash
git add components/__tests__/FolderView.test.tsx
git commit -m "test: add failing tests for FolderView split panel"
```

---

### Task 3: Implement FolderView

**Files:**
- Create: `components/FolderView.tsx`

- [ ] **Step 1: Create FolderView.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Folder, Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  folder: Folder
  folderTracks: Track[]
  activeTrack: Track | null
  onTrackClick: (track: Track) => void
  onBack: () => void
}

export default function FolderView({ folder, folderTracks, activeTrack, onTrackClick, onBack }: Props) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
    folderTracks[0]?.id ?? null
  )

  const selectedTrack = folderTracks.find(t => t.id === selectedTrackId) ?? null

  function handleRowClick(track: Track) {
    setSelectedTrackId(track.id)
    onTrackClick(track)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-[var(--color-text-primary)] text-sm transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-[var(--color-text-primary)] text-base font-semibold">{folder.name}</h2>
      </div>

      {folderTracks.length === 0 ? (
        <p className="text-gray-600 text-sm">This folder is empty.</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-2/5">
            <div
              className="w-full aspect-square rounded-xl overflow-hidden relative"
              style={!selectedTrack?.cover_url ? getGradientStyle(selectedTrack?.id ?? folder.id) : { background: '#1a1a1a' }}
            >
              {selectedTrack?.cover_url && (
                <img
                  src={selectedTrack.cover_url}
                  alt={selectedTrack.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="mt-3">
              <p className="text-[var(--color-text-primary)] text-sm font-semibold truncate">{folder.name}</p>
              <p className="text-gray-500 text-xs mt-1">{folderTracks.length} track{folderTracks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="md:w-3/5 flex flex-col gap-1 overflow-y-auto max-h-[480px]">
            {folderTracks.map(track => (
              <button
                key={track.id}
                onClick={() => handleRowClick(track)}
                className={`flex items-center gap-3 p-2 rounded-lg text-left w-full transition-colors hover:bg-[var(--color-bg-surface)] ${activeTrack?.id === track.id ? 'ring-2 ring-[var(--color-accent-ring)]' : ''}`}
              >
                <div
                  className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative"
                  style={!track.cover_url ? getGradientStyle(track.id) : { background: '#1a1a1a' }}
                >
                  {track.cover_url && (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-[var(--color-text-primary)] text-sm font-medium truncate">{track.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests — confirm all 9 pass**

```bash
npx jest components/__tests__/FolderView.test.tsx --no-coverage
```

Expected: all 9 tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/FolderView.tsx
git commit -m "feat: add FolderView split-panel component"
```

---

### Task 4: Wire FolderView into page.tsx

**Files:**
- Modify: `app/tracks/page.tsx`

- [ ] **Step 1: Add FolderView import**

In `app/tracks/page.tsx`, add this import after the existing component imports (after the `PlayerBar` import line):

```tsx
import FolderView from '../../components/FolderView'
```

- [ ] **Step 2: Replace the inline folder view block**

Find this block (around line 493):

```tsx
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
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
```

Replace with:

```tsx
{folderView ? (
  <FolderView
    folder={folderView}
    folderTracks={tracks.filter(t => t.folder_id === folderView.id)}
    activeTrack={activeTrack}
    onTrackClick={handleTrackClick}
    onBack={() => setFolderView(null)}
  />
) : (
```

- [ ] **Step 3: Remove onTrackClick from FolderCard**

In the same file, find the `<FolderCard` block and remove the `onTrackClick={handleTrackClick}` line so it reads:

```tsx
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all FolderCard (7) and FolderView (9) tests pass. Pre-existing TrackCard/PlayerBar failures due to missing Supabase env vars are unrelated and expected.

- [ ] **Step 6: Commit**

```bash
git add app/tracks/page.tsx
git commit -m "feat: wire FolderView into page; make FolderCard navigation-only"
```

---

## Self-Review

**Spec coverage:**
- ✅ FolderCard tile click handlers removed (Task 1)
- ✅ `onTrackClick` removed from FolderCard props (Task 1)
- ✅ Back button renders and calls onBack (Task 2/3)
- ✅ Empty folder → "This folder is empty." (Task 2/3)
- ✅ Left panel shows selected track cover art (Task 2/3)
- ✅ Left panel defaults to first track on mount (Task 2/3)
- ✅ Gradient fallback for missing cover_url (Task 2/3)
- ✅ Right panel: scrollable track list (Task 2/3)
- ✅ Track row: cover thumbnail + title (Task 2/3)
- ✅ Active track row highlight via `ring-2` (Task 2/3)
- ✅ Clicking row updates left cover + triggers playback (Task 2/3)
- ✅ Mobile stacks vertically (`flex-col`), desktop side-by-side (`md:flex-row`) (Task 2/3)
- ✅ page.tsx wired up (Task 4)

**Placeholder scan:** None found.

**Type consistency:** `onTrackClick: (track: Track) => void` defined in FolderView Props (Task 3), passed as `handleTrackClick` in page.tsx (Task 4) — consistent. `onBack: () => void` defined in Props (Task 3), passed as `() => setFolderView(null)` (Task 4) — consistent.
