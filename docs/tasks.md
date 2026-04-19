# Tasks

## Completed Today (2026-04-18)

### Transport Controls — Image Assets
- Replaced PlayerBar Play/Pause with `/icons/play-button.png` and `/icons/pause-button.png`
- Replaced PlayerBar Back/Next with `/icons/back-button.png` and `/icons/next-button.png`
- All four controls: 28×28px, `hover:scale-105`, `draggable={false}`

### Header & Button Animations
- `.brand-chrome`: animated metallic shimmer on "XTRAMILE" header (3.5s linear infinite via `background-position`)
- `.btn-chrome::before`: hover-only shimmer sweep on "Upload Track" button — no animation when idle

### Folder System (full implementation)
- `supabase/migrations/002_folders.sql` — `folders` table with RLS + `folder_id` FK on `tracks`
- `lib/types.ts` — `Folder` interface added; `Track` updated with `folder_id`, `display_order`, `cover_url`
- `components/FolderCard.tsx` — complete component: click to open, rename modal, delete, track count, amber gradient
- `components/TrackMenu.tsx`:
  - "Create New Folder" creates folder and moves current track into it
  - Smart menu: tracks outside folder show "Create New Folder" + "Add to Folder"; tracks inside folder show "Move to Folder" + "Remove from Folder"
  - `handleRemoveFromFolder` — instantly sets `folder_id = null` and updates local state
- `components/TrackCard.tsx`:
  - `onFolderCreated` prop wired through to TrackMenu
  - `isFolderTarget` renders full amber overlay with 📁 and "Drop to create folder" label
- `app/tracks/page.tsx`:
  - `folders` state, `folderView` state, `folderTarget` state
  - `fetchFolders`, `handleDeleteFolder`, `handleRenameFolder`, `handleFolderCreatedFromMenu`
  - `handleFolderDrop` — creates folder from DnD pair, assigns both tracks
  - `handleDragOver` — 1000ms dwell timer sets `folderTarget`; moving away cancels timer
  - `handleDragEnd` — if `folderTarget === over.id`, opens name modal; otherwise performs sort
  - Main grid: "Folders" section above "All Tracks"; only unfoldered tracks shown in DnD grid
  - Folder view: back button, filtered track grid, no DnD

---

## Previously Completed (2026-04-17)

### Session 3 — Drag & Drop Foundation
- `lib/types.ts` — `display_order` and `folder_id` added to Track; Folder interface added
- `components/TrackCard.tsx` — `useSortable` integration, drag on artwork div only, `isFolderTarget` amber ring

### Session 2 — TrackMenu Features
- Offline download/remove via Cache API + localStorage
- BPM/Key detection via Meyda (RMS onset + autocorrelation, chroma + Krumhansl-Kessler)
- Add to Queue + queue badge
- Replace Audio with version tracking
- Notes (freeform text)
- Insights modal (BPM, key, play count, analyze)

### Session 1 — Initial Build
- Next.js 16 + Supabase + Tailwind CSS 4 + TypeScript scaffold
- Auth (login/signup), session redirect
- Track grid, upload modal, PlayerBar (seek, prev/next, time)
- TrackCard (gradient or cover, active ring)
- Theme (light/dark/system, Supabase persistence)
- Search (title/BPM/key)
- Profile (display_name, handle, avatar color)
- Audio analysis (Meyda BPM + key in Insights)
- Offline Cache API integration

---

## In Progress / Needs Attention

- **Delete debugging**: `handleDelete` in `TrackMenu.tsx` has console.log statements left over from a debugging session — root cause of occasional delete failures not confirmed

---

## Next Steps

### Drag-to-folder improvements
- Drop track onto existing `FolderCard` to move it into that folder (currently only track-onto-track creates folders)
- Reorder tracks inside folder view (no DnD context in folder view currently)
- Auto-delete empty folders when last track is removed

### Folder UX
- Show folder name in PlayerBar or track title when playing a track from inside a folder
- Folder ordering / sort (currently ordered by `created_at` only)

### Cleanup
- Remove console.log statements from `handleDelete` in `TrackMenu.tsx` once root cause is confirmed
- Apply `supabase/migrations/002_folders.sql` to production if not yet done

### Possible additions
- Batch select tracks to move into a folder at once
- Folder cover art (derived from member track covers)
- Collaborative folders (shared with other users)
