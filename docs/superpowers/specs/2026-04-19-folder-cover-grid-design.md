# Folder Cover Art Grid — Design Spec
**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Update `FolderCard` so the square thumbnail displays track cover art as a structured tile grid rather than a fixed 2×2 preview. The folder container shape (square, rounded) and folder view navigation are unchanged.

---

## Grid Logic

Track count determines the tile layout inside the `aspect-square` image area:

| Track count | Layout |
|-------------|--------|
| 0 | Emoji placeholder (📁) — unchanged |
| 1 | Single tile, full-bleed |
| 2–4 | 2×2 grid (`grid-cols-2`), all tracks shown |
| 5+ | First track's cover art full-bleed + track count pill badge |

For the 5+ case the pill badge sits bottom-right inside the image area, showing e.g. `12 tracks` in a small rounded label (`bg-black/60`, white text, `text-xs`).

Gradient fallback (`getGradientStyle(track.id)`) applies whenever `track.cover_url` is null — same as existing behavior.

---

## Container

No structural changes to the container. Existing classes are kept:
- `aspect-square` — enforces 1:1 ratio
- `rounded-xl` — rounded corners
- `overflow-hidden` — clips grid content cleanly
- `bg-[var(--color-bg-elevated)]` — card surface color

Gap between tiles in the 2×2 grid: `1.5px` (tight mosaic feel).

---

## Interaction

### Individual tile click (1 track / 2–4 tracks)
Each tile registers `onClick` with `e.stopPropagation()` to prevent bubbling to the folder card. Calls the existing play/open-track handler passed down from the parent (same handler `TrackCard` uses — likely `onPlay(track)`).

### Folder card click (label area)
The outer card `onClick` still fires when the user clicks the label area (folder name / track count text below the image). This navigates to the folder view — behavior unchanged.

### 5+ case
The full-bleed cover image is not individually clickable (it represents the whole folder). Clicking it triggers folder navigation (same as clicking the label area).

### Hover feedback
Tiles in the 1×1 and 2×2 cases get a CSS `hover:brightness-110 transition-all` for interactivity feedback. The 5+ full-bleed image gets the same card-level `hover:ring-2` ring already on the container.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Folder empty | 📁 emoji placeholder, centered |
| Folder is drop target | Existing `📂 Add to folder` overlay — unchanged |
| `cover_url` is null | `getGradientStyle(track.id)` gradient fill |
| Track count = 5+ | First track cover art; if that track has no cover, gradient fallback |

---

## Files Affected

| File | Change |
|------|--------|
| `components/FolderCard.tsx` | Replace grid rendering logic only — no structural changes outside the image area |

No changes to: `app/tracks/page.tsx`, `lib/types.ts`, `TrackCard.tsx`, `globals.css`, or any data layer.

---

## Out of Scope

- Folder expanded/detail view (already works via `folderView` state in page.tsx)
- Track data model
- Drag-and-drop behavior
- Rename / delete menu
