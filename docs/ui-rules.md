# UI Rules

## Colors — always use CSS custom properties

```css
var(--color-bg-base)       /* page background */
var(--color-bg-surface)    /* nav, cards surface */
var(--color-bg-elevated)   /* card fill, inputs */
var(--color-bg-player)     /* PlayerBar background */
var(--color-border)        /* borders */
var(--color-text-primary)  /* main text */
var(--color-text-label)    /* uppercase section labels */
```

Never hardcode dark/light hex values — always use these vars so theming works.

## Theming

- Three modes: `light`, `dark`, `system`
- Applied via `data-theme` attribute on `<html>` — set by `applyTheme()` in `lib/theme.ts`
- Default (no attribute) is dark
- CSS media query `prefers-color-scheme: light` handles `system` mode

## Layout

- Track grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`
- Cards: `rounded-xl overflow-hidden bg-[var(--color-bg-elevated)]`
- Card artwork: `w-full aspect-square` (square ratio enforced)
- PlayerBar: `fixed bottom-0` — page needs `pb-24` to avoid overlap
- Menus/modals: rendered via `createPortal(..., document.body)` — required to escape CSS transform contexts from dnd-kit

## Track States (rings)

- Active track: `ring-2 ring-purple-500`
- Folder drop target: `ring-2 ring-amber-400`

## Icons (emoji-based, no icon library)

- Playing: `▶`
- Not playing: `♪`
- Folder target: `📁`
- Folder card: `📁`
- Menu trigger: `⋯`

## Drag and Drop

- Drag handle is the **artwork div only** — listeners on artwork, not the whole card
- This prevents drag from interfering with TrackMenu button clicks (button is a sibling, not a child of artwork)
- DndContext must wrap the full page so portal-rendered FolderModal shares the same context
- SortableContext includes track IDs only — folders are not sortable

## Responsive

- Nav hides email on small screens: `hidden sm:block`
- Grid collapses from 4 → 3 → 2 columns at breakpoints
