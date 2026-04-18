# Changelog

## Session 3 (2026-04-17) — Drag & Drop (in progress)

### Completed
- `lib/types.ts` — added `display_order` and `folder_id` to Track; added Folder interface
- `components/TrackCard.tsx` — integrated `useSortable`, drag listeners on artwork div only, `isFolderTarget` amber ring prop
- `components/FolderCard.tsx` — created new component (track count, click handler, hover scale)

### Incomplete
- `components/FolderModal.tsx` — not created (write rejected mid-session)
- `app/tracks/page.tsx` — not updated (DndContext, folder state, reorder/folder logic not added)

---

## Session 2 (2026-04-17) — TrackMenu Features

### Fixed
- **Download** — changed from file-download to Cache API (`caches.open('xtramile-offline')`) for offline playback
- **Remove Download** — toggles based on `localStorage` marker; shows purple checkmark when cached
- **BPM/Key detection** — replaced simple peak detection with Meyda:
  - BPM: RMS onset strength + autocorrelation (60–180 BPM range)
  - Key: chroma features + Krumhansl-Kessler profiles + Pearson correlation
- **Add to Queue** — wired to `queue` state in tracks page; PlayerBar next dequeues first
- **Queue badge** — fixed bottom-right pill showing count when queue non-empty
- **Replace Audio** — active track now syncs `file_path` via `useEffect` watching `tracks` array
- **Delete** — added step-by-step console logging for debugging (root cause unconfirmed)

---

## Session 1 (2026-04-17) — Initial Build

- Scaffold: Next.js 16, Supabase, Tailwind CSS 4, TypeScript
- Auth: login page, session redirect
- Tracks page: grid, upload modal, PlayerBar
- TrackCard: gradient artwork, active state
- PlayerBar: seek bar, prev/next, time display
- Theme: light/dark/system with Supabase persistence
- Search: filter by title, BPM, key
- Profile: display_name, handle, deterministic avatar color
- Offline: Cache API integration in audio load
- TrackMenu: context menu with portal, all menu items scaffolded
- Audio analysis: Meyda BPM + key detection in Insights modal
- Notes: freeform text saved to DB
