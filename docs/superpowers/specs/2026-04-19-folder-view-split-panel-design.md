# Folder View Split Panel — Design Spec
**Date:** 2026-04-19
**Status:** Approved

---

## Overview

Replace the current folder view (a flat grid of TrackCards) with a split-panel layout: large cover preview on the left, scrollable track list on the right. Playback is strictly isolated to track row interactions inside the folder view. Folder cards in the grid become pure navigation elements — no tile-level playback.

---

## Behavior Changes

### FolderCard (grid thumbnail)
- Remove `onTrackClick` prop entirely from `FolderCard`.
- Tiles in the 1-track and 2–4 track layouts lose their `onClick` handlers, `cursor-pointer`, and `hover:brightness-110` styles. They become decorative.
- The 5+ full-bleed case is already non-clickable — no change.
- The entire card's outer `onClick` fires for all clicks (image area + label area), navigating to folder view.

### page.tsx
- Remove `onTrackClick={handleTrackClick}` from `<FolderCard>`.
- Replace the inline folder view block (current lines 493–524) with `<FolderView>`.

---

## FolderView Component

**File:** `components/FolderView.tsx`

### Props

```tsx
interface Props {
  folder: Folder
  folderTracks: Track[]
  activeTrack: Track | null
  isPlaying: boolean
  onTrackClick: (track: Track) => void
  onBack: () => void
}
```

### Layout

**Desktop (md+):** Two-column flex row.

| Panel | Width | Content |
|-------|-------|---------|
| Left | ~40% | Square cover image + folder name + track count below |
| Right | ~60% | Folder name heading + scrollable track list |

**Mobile (below md):** Stack vertically — cover image full-width `aspect-square` (natural square, not fixed height), track list below.

### Left Panel

- Square cover image area.
- Shows the cover of the currently `selectedTrack` (local state, see State section).
- If `track.cover_url` is set: `<img>` fills the panel with `object-cover`.
- If `track.cover_url` is null: `getGradientStyle(track.id)` gradient fill.
- Below the image: folder name (semibold) + track count (small, muted).

### Right Panel

- Folder name as a heading (`text-base font-semibold`).
- Scrollable (`overflow-y-auto`) list of track rows.
- Each track row contains:
  - 40×40px square cover thumbnail (`rounded-md`, gradient fallback if no `cover_url`)
  - Track title (truncated)
  - Active highlight when `activeTrack?.id === track.id`: accent ring or background tint
- Clicking a row: updates `selectedTrackId` (left panel cover) + calls `onTrackClick(track)`

### Back Navigation

`← Back` button above the panel, calls `onBack`.

### Empty State

If `folderTracks.length === 0`: render centered "This folder is empty." text instead of the split panel.

---

## State

### Local state in FolderView

```tsx
const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
  folderTracks[0]?.id ?? null
)
```

- Initialized to `folderTracks[0]?.id` on mount.
- Updated to `track.id` when a track row is clicked.
- The left panel cover derives from `folderTracks.find(t => t.id === selectedTrackId)`.

### Active row highlight

Uses `activeTrack?.id === track.id` (the actually-playing track from the parent), not `selectedTrackId`. This keeps the playing indicator accurate even if the user plays something outside the folder.

### No new state in page.tsx

`folderView` (existing) still controls which folder is open. No new top-level state required.

---

## Files Affected

| File | Change |
|------|--------|
| `components/FolderView.tsx` | New component |
| `components/FolderCard.tsx` | Remove `onTrackClick` prop and tile click handlers |
| `app/tracks/page.tsx` | Remove `onTrackClick` from `<FolderCard>`; replace inline folder view with `<FolderView>` |
| `components/__tests__/FolderView.test.tsx` | New test file |
| `components/__tests__/FolderCard.test.tsx` | Update tests — remove `onTrackClick` prop, tile click tests |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty folder | "This folder is empty." centered in place of split panel |
| Track with no cover_url | `getGradientStyle(track.id)` in both left panel and row thumbnail |
| activeTrack is from outside the folder | Row highlight still shows the correct playing track; left panel shows selectedTrack independently |
| Single track in folder | Left panel shows its cover; row list has one row |

---

## Out of Scope

- Drag-and-drop within the folder view
- Reordering tracks in the folder
- Adding/removing tracks from within the folder view
- Folder cover art customization
