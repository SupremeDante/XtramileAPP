# Current State
_Last updated: 2026-04-18_

## Working Features

### Authentication
- Email/password sign-in and sign-up
- `display_name` and `handle` stored in `profiles` table on first login
- Session-based redirect: unauthenticated users are sent to `/login`
- Deterministic avatar color derived from `user_id`

### Track Grid
- Responsive 2/3/4-column grid (`sm:grid-cols-3 lg:grid-cols-4`)
- Sorted by `display_order` ascending (nulls last), fallback `created_at` descending
- Cards show cover art (image or deterministic gradient), title, uploader handle
- Active track highlighted with a grey ring (`ring-[var(--color-accent-ring)]`)

### Search
- Real-time filter by title, BPM, or key (case-insensitive)
- Only shows user's own tracks in filtered results

### Upload
- Modal with title input and audio file picker
- Uploads to Supabase Storage (`audio` bucket), inserts row into `tracks` table

### Playback
- HTML5 `<audio>` element with ref shared between page and PlayerBar
- Loads from Cache API first (offline support), falls back to Supabase public URL
- Seek bar click to jump; animated inner glow pauses when not playing
- Prev/Next buttons; queue support (next dequeues from front)
- Play count logged to `track_plays` table on first play per track load

### PlayerBar (transport controls)
- Back, Play/Pause, Next controls use image assets from `/public/icons/`:
  - `/icons/back-button.png`, `/icons/play-button.png`, `/icons/pause-button.png`, `/icons/next-button.png`
- All buttons 28×28px with `hover:scale-105` transition
- Track thumbnail (gradient or cover art), title, uploader handle displayed left
- Seek bar with `currentTime / duration` display right

### Queue
- "Add to Queue" in TrackMenu appends track to queue array
- `handleNext` dequeues from front when queue is non-empty, otherwise advances index
- Badge pill (bottom-right) shows queue count when non-zero

### Theme
- Light / Dark / System (respects `prefers-color-scheme`)
- Persisted in `user_settings` table via `lib/theme.ts`
- Applied via `data-theme` attribute on `<html>`

### Offline Playback
- "Download" in TrackMenu caches the public audio URL via Cache API
- `localStorage` key tracks offline status per track
- On playback, cached response is used if available
- "Remove Download" deletes from cache + removes localStorage key

### TrackMenu (context menu)
All actions are available via the `⋮` button on each TrackCard. Menu items adapt based on track state:

**Always shown:**
- Replace Audio — uploads new file, creates version history entry
- Notes — freeform text saved to `tracks.notes`
- Export Audio — downloads audio file via blob URL
- Duplicate — inserts a copy of the track
- Insights — shows BPM, key, play count; allows manual edit and audio analysis
- Add to Queue
- Download / Remove Download (toggles based on cache state)
- Change Cover — uploads image to `covers` bucket, saves URL
- Remove Cover (shown only when `cover_url` is set)
- Version History — opens `VersionHistoryModal` to browse and activate past versions
- Delete

**Folder-aware (conditional):**
- Track NOT in a folder: "Create New Folder" + "Add to Folder"
- Track IN a folder: "Move to Folder" + "Remove from Folder" (amber text)

### Audio Analysis (Insights modal)
- Runs in-browser using Meyda
- BPM: RMS envelope → onset strength → autocorrelation over 60–180 BPM lag range
- Key: chroma features → Krumhansl-Kessler profiles → Pearson correlation
- Results are editable and saved to `tracks.bpm` and `tracks.key`

### Version History
- Each "Replace Audio" creates a `track_versions` row with incrementing `version_number`
- `VersionHistoryModal` lists versions with dates; user can activate any version
- Activating sets `is_active = true` on the selected version and updates `tracks.file_path`

### Cover Art
- Per-track image upload stored in Supabase Storage (`covers` bucket)
- Displayed in TrackCard and PlayerBar thumbnail
- Falls back to deterministic gradient if no cover set

### Drag-and-Drop Reorder
- Powered by `@dnd-kit/core` and `@dnd-kit/sortable`
- Drag handle is the artwork area only (listeners on inner div, not outer card)
- Releasing reorders the array and persists `display_order` to all affected tracks
- `PointerSensor` with `distance: 8` activation constraint to prevent accidental drags
- `wasDragging` ref prevents a drag release from firing the track click handler

---

## Folder System

### Creating Folders
Two methods:

1. **From TrackMenu** ("Create New Folder"):
   - Opens a name input modal
   - Creates a folder row in the `folders` table
   - Immediately moves the current track into the new folder
   - Refreshes folder and track lists

2. **Drag-to-create** (drag one track onto another):
   - After hovering over a target unfoldered track for 1000ms, an amber overlay appears on the target card with "Drop to create folder"
   - Releasing the drag triggers a name input modal
   - Confirming creates the folder and assigns both tracks to it
   - Moving away before 1000ms cancels the timer — no overlay shown

### Folder Grid
- "Folders" section renders above "All Tracks" when any folders exist
- Each `FolderCard` shows folder name, track count, amber gradient background, 📁 emoji
- Clicking a FolderCard enters folder view

### Folder View
- Replaces the main grid with a filtered view of tracks inside that folder
- Back button (← Back) returns to the main grid
- Tracks inside folder view do not participate in DnD (static grid)
- All TrackMenu actions remain available on folder-view tracks

### Managing Folders
- **Rename**: FolderCard `⋮` menu → Rename modal → updates `folders.name` in DB
- **Delete**: FolderCard `⋮` menu → sets `folder_id = null` on all member tracks, then deletes folder row
- Deleting the currently open folder returns to main grid

### Moving Tracks Between Folders
- "Add to Folder" (track not in folder): shows list of existing folders to move into
- "Move to Folder" (track in folder): same list, current folder marked with ✓
- "Remove from Folder" (track in folder): instantly sets `folder_id = null`, returns track to main grid

### Data Model
- `folders` table: `id`, `user_id`, `name`, `created_at` with RLS (users see only their own)
- `tracks.folder_id`: nullable FK to `folders.id` (`on delete set null`)
- Migration file: `supabase/migrations/002_folders.sql`

---

## UI / Styling

### XTRAMILE Header
- `.brand-chrome` class: animated metallic shimmer (left→right) using `background-position` animation
- 3.5s linear infinite, adapts gradient colors for light theme

### Upload Track Button
- `.btn-chrome` class: metallic gradient with hover-activated shimmer sweep via `::before` pseudo-element
- Sweep only animates while hovered; stops immediately on mouse-out

### Button Variants
- `.btn-chrome` — rectangular metallic button (used for Upload Track)
- `.btn-chrome-circle` — circular `⋮` menu trigger on TrackCard and FolderCard

---

## Partially Implemented / Known Issues

- **Delete debugging**: console.log statements remain in `handleDelete` for diagnosing RLS/silent errors — root cause not confirmed
- **DnD inside folder view**: tracks inside a folder cannot be reordered by drag (no DnD context in folder view)
- **Drag onto existing folder**: dropping a track onto a FolderCard does not move it into that folder — only track-onto-track creates folders
- **Supabase migration**: `supabase/migrations/002_folders.sql` must be applied manually in the Supabase dashboard — it is not auto-run
