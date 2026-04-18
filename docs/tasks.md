# Tasks

## In Progress

### Drag-and-Drop (item 4)
Completing full DnD implementation. Files remaining:

**1. `components/FolderModal.tsx` (NOT CREATED)**
- Portal modal (`createPortal(..., document.body)`)
- Inner `DraggableFolderTrack` using `useDraggable({ id: track.id, data: { fromFolder: true, folderId: folder.id } })`
- Artwork thumbnail as drag handle (shows ⠿ icon)
- Click on track text → plays track via `onClick` prop
- Close button

**2. `app/tracks/page.tsx` (NOT UPDATED)**
Needs:
- Import: `DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors` from `@dnd-kit/core`
- Import: `SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates` from `@dnd-kit/sortable`
- State: `folders: Folder[]`, `draggingId`, `folderCreationTargetId`, `pendingFolderPair`, `showFolderNamePrompt`, `newFolderName`, `openFolder`
- Refs: `folderTimerRef`, `folderPairRef`
- `fetchFolders(uid?)` — queries `folders` table ordered by `created_at`
- Update `fetchTracks` ordering: `display_order` ascending (nulls last), then `created_at`
- `handleDragStart` — set `draggingId`
- `handleDragOver` — 1-second hover timer for folder-pair detection; set `folderCreationTargetId` for amber ring
- `handleDragEnd` — if `fromFolder` data: set `folder_id = null`; if folder pair confirmed: prompt for name; else reorder + save
- `handleCreateFolder(name, trackA, trackB)` — insert folder, update both tracks' `folder_id`
- `saveDisplayOrder(tracks[])` — batch update `display_order`
- `moveTrackOutOfFolder(trackId)` — set `folder_id = null`
- Wrap content in `DndContext`
- Wrap track items in `SortableContext` (track IDs only, not folder IDs)
- Render `FolderCard` components after tracks (sorted by `created_at`)
- Render `FolderModal` when `openFolder` is set
- Render folder name prompt modal when `showFolderNamePrompt`
- Render `DragOverlay` with ghost card

## Backlog

- **Delete bug**: confirm root cause (check console output for RLS error vs silent failure)
- **FolderCard drag-over**: folders in the grid should also be valid drop targets (drag track into existing folder)
- **Folder rename**: right-click or long-press on FolderCard
- **Empty folder cleanup**: auto-delete folder when last track is dragged out
