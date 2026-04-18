# Current State

## Working Features

- **Auth**: email/password sign in/up with display_name and handle stored in profiles
- **Track grid**: responsive 2/3/4-col grid, sorted by `display_order` (fallback `created_at`)
- **Search**: filters by title, BPM, or key
- **Upload**: title + audio file → Supabase Storage + DB insert
- **Playback**: HTML5 audio, PlayerBar with seek, prev/next, queue
- **Queue**: add to queue from TrackMenu; badge shows count; next dequeues first
- **Theme**: light/dark/system persisted in `user_settings` table
- **Offline**: Cache API stores public URL response; playback loads from cache first
- **TrackMenu**: Replace Audio, Notes, Export Audio, Duplicate, Insights (BPM/key + Analyze), Add to Queue, Download/Remove Download, Move (to folder), Delete
- **Audio analysis**: Meyda RMS onset autocorrelation (BPM 60–180), chroma + Krumhansl-Kessler (key)
- **FolderCard component**: renders folder UI (not wired into page yet)
- **TrackCard dnd-kit**: `useSortable` on each card, drag listeners on artwork div only

## Incomplete / In-Progress

- **Drag-and-drop wiring** (partially done):
  - `lib/types.ts` ✓
  - `components/TrackCard.tsx` ✓
  - `components/FolderCard.tsx` ✓
  - `components/FolderModal.tsx` — **NOT CREATED**
  - `app/tracks/page.tsx` — **NOT UPDATED** for DnD (no DndContext, no folder state, no reorder logic)

- **Delete bug**: console.logs are in place but root cause unconfirmed (likely RLS or silent Supabase error)

## Known Gaps

- `FolderModal.tsx` does not exist — folders cannot be opened
- No `DndContext` in page — drag-and-drop has no effect at runtime
- `display_order` not persisted on reorder (no save call in page)
- `folder_id` not set on drag-to-folder (no handler in page)
