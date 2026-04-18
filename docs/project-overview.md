# Project Overview

**Xtramile** — a music sharing web app for uploading, organizing, and playing tracks.

## Stack

- **Next.js 16.2.4** — App Router, all client components (`'use client'`)
- **React 19** / **TypeScript 5**
- **Supabase** — Auth, PostgreSQL, Storage (bucket: `audio`)
- **Tailwind CSS 4** — dark-first, CSS custom properties for theming
- **@dnd-kit** — drag-and-drop (core, sortable, utilities)
- **Meyda 5.6.3** — audio feature extraction (BPM, key)
- **Cache API** — offline playback storage

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Auth redirect (→ `/tracks` or `/login`) |
| `/login` | Email/password sign in & sign up |
| `/tracks` | Main app: grid, upload, playback, search |

## Database Tables

| Table | Key Columns |
|-------|------------|
| `tracks` | id, user_id, title, file_path, uploader_email, created_at, bpm, key, display_order, folder_id |
| `folders` | id, user_id, name, created_at |
| `profiles` | id, handle, display_name, avatar_url |
| `user_settings` | user_id, theme |

Storage bucket: `audio` — public read, authenticated write.

## Architecture

- All state lives in `app/tracks/page.tsx`, passed down as props
- Menus and modals use `createPortal` (escapes CSS transform contexts)
- Audio playback via HTML5 `<audio>` ref
- Theming via `data-theme` attribute on `<html>`, CSS custom properties
