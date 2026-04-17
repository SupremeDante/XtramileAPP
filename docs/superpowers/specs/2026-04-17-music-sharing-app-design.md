# Xtramile Music Sharing App — Design Spec

**Date:** 2026-04-17
**Status:** Approved

---

## Overview

A bare-bones music sharing web app to prove the concept. Users sign up, upload audio tracks with a title, browse all uploaded tracks in a grid, and play tracks via a persistent bottom bar player.

---

## Stack

- **Framework:** Next.js 14, App Router, all client components (`"use client"`)
- **Backend/DB:** Supabase (Auth, Postgres, Storage)
- **Styling:** Tailwind CSS

---

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/tracks` if authenticated, else `/login` |
| `/login` | Sign up / sign in form (email + password) |
| `/tracks` | Main page: track grid + upload modal + bottom player |

---

## File Structure

```
app/
  layout.tsx          # Root layout, Supabase session provider
  page.tsx            # Redirect logic
  login/
    page.tsx          # Auth form
  tracks/
    page.tsx          # Track grid + upload modal + bottom player
lib/
  supabase.ts         # Supabase browser client (singleton)
  types.ts            # Track type definition
```

---

## Data Model

### Supabase: `tracks` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, default gen_random_uuid() |
| `user_id` | uuid | FK → auth.users.id |
| `title` | text | User-provided on upload |
| `file_path` | text | Path in Storage bucket |
| `created_at` | timestamptz | Default now() |

### Supabase Storage

- Bucket: `audio`
- Public read (anyone can stream), authenticated write
- File path pattern: `{user_id}/{timestamp}-{filename}`

### RLS Policies

- `tracks`: SELECT open to all authenticated users; INSERT restricted to own `user_id`
- Storage `audio` bucket: public GET, authenticated PUT/POST

---

## Features

### 1. Auth (`/login`)

- Single page with toggle between Sign Up and Sign In
- Fields: email, password
- Uses `supabase.auth.signInWithPassword` / `signUp`
- On success: redirect to `/tracks`
- On error: show inline error message
- Sign out button in nav calls `supabase.auth.signOut` → redirect to `/login`

### 2. Track Grid (`/tracks`)

- Fetches all rows from `tracks` table on mount, ordered by `created_at DESC`
- 4-column responsive grid (2 cols on mobile, 3 on tablet, 4 on desktop)
- Each card:
  - Square color-gradient placeholder (color derived deterministically from `track.id`)
  - Track title (truncated)
  - Uploader identifier (email prefix)
  - Click → sets active track in player

### 3. Upload Modal

- Triggered by "Upload Track" button in nav (authenticated users only)
- Fields: title (text input), audio file (file picker, `accept="audio/*"`)
- On submit:
  1. Upload file to Supabase Storage bucket `audio`
  2. Insert row into `tracks` table with returned `file_path`
  3. Close modal, refresh track list
- Shows loading state during upload; shows error on failure

### 4. Bottom Player Bar

- Persists at bottom of `/tracks` page
- Hidden until a track is selected
- Displays: gradient thumbnail, track title, uploader
- Controls: previous, play/pause, next (cycles through loaded tracks list)
- Seek bar: shows progress, clickable to seek
- Uses native HTML5 `<audio>` element (ref-based)
- Getting public URL: `supabase.storage.from('audio').getPublicUrl(file_path)`

---

## Auth Guard

`/tracks` checks session on mount via `supabase.auth.getSession()`. If no session, redirects to `/login`. No middleware needed for POC.

---

## Out of Scope (POC)

- Cover art upload (gradient placeholder only)
- Track descriptions
- Likes, comments, follows
- Search or filtering
- Waveform visualization
- Server components / SSR
- Middleware-based auth protection
