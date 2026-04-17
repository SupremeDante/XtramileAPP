# Music Sharing App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bare-bones music sharing web app — email/password auth, audio upload, track grid with gradient placeholders, and a persistent bottom bar player.

**Architecture:** All-client Next.js 14 App Router app (every page/component is `"use client"`). Supabase handles auth, Postgres (`tracks` table), and audio file storage. State lives in the tracks page; child components receive props. No server components beyond the root layout.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `@supabase/supabase-js` v2, Jest + React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `app/layout.tsx` | Root HTML shell, Tailwind globals |
| `app/globals.css` | Tailwind directives only |
| `app/page.tsx` | Redirects to `/tracks` or `/login` based on session |
| `app/login/page.tsx` | Sign up / sign in form |
| `app/tracks/page.tsx` | Track grid, upload modal trigger, audio element, player |
| `lib/supabase.ts` | Singleton Supabase browser client |
| `lib/types.ts` | `Track` interface |
| `lib/gradient.ts` | `getGradientStyle(id)` — deterministic color from track id |
| `components/TrackCard.tsx` | Single track card with gradient placeholder |
| `components/UploadModal.tsx` | Modal: title input + file picker + upload logic |
| `components/PlayerBar.tsx` | Fixed bottom bar: thumbnail, controls, seek bar |

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `jest.config.js`, `jest.setup.ts`

- [ ] **Step 1: Run create-next-app**

```bash
cd "c:/Users/supre/Downloads/Xtramile/Xtramile--APP"
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

When prompted, accept all defaults. The `.` installs into the current directory.

- [ ] **Step 2: Install Supabase client and testing libraries**

```bash
npm install @supabase/supabase-js
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest
```

- [ ] **Step 3: Create jest.config.js**

```js
// jest.config.js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

module.exports = createJestConfig(customConfig)
```

- [ ] **Step 4: Create jest.setup.ts**

```ts
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

Open `package.json` and add `"test": "jest"` to the `scripts` section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest"
}
```

- [ ] **Step 6: Create .env.local**

```bash
# .env.local — fill these in after Supabase setup (Task 2)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 7: Add .superpowers to .gitignore**

Open `.gitignore` (created by create-next-app) and append:

```
.superpowers/
.env.local
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind, Supabase, and Jest"
```

---

## Task 2: Supabase infrastructure (manual steps)

**This task is performed in the Supabase dashboard — no code to write.**

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com, create a new project. Note your project URL and anon key (Settings → API). Fill them into `.env.local`.

- [ ] **Step 2: Create the tracks table**

In the Supabase dashboard, go to SQL Editor and run:

```sql
create table tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  file_path text not null,
  uploader_email text not null,
  created_at timestamptz default now() not null
);

-- Allow any authenticated user to read all tracks
alter table tracks enable row level security;

create policy "Anyone authenticated can read tracks"
  on tracks for select
  to authenticated
  using (true);

create policy "Users can insert their own tracks"
  on tracks for insert
  to authenticated
  with check (auth.uid() = user_id);
```

- [ ] **Step 3: Create the audio storage bucket**

In the Supabase dashboard, go to Storage → New bucket:
- Name: `audio`
- Public: **enabled** (so audio URLs work without auth tokens)

Then in Storage → Policies, add these policies for the `audio` bucket:

```sql
-- Allow authenticated users to upload
create policy "Authenticated users can upload audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audio');

-- Allow public read (already handled by public bucket, but explicit is fine)
create policy "Public can read audio"
  on storage.objects for select
  to public
  using (bucket_id = 'audio');
```

- [ ] **Step 4: Confirm env vars are set**

Verify `.env.local` has real values (not placeholders) before continuing.

---

## Task 3: Supabase client and types

**Files:**
- Create: `lib/supabase.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/supabase.ts**

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Create lib/types.ts**

```ts
// lib/types.ts
export interface Track {
  id: string
  user_id: string
  title: string
  file_path: string
  uploader_email: string
  created_at: string
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts lib/types.ts
git commit -m "feat: add Supabase client and Track type"
```

---

## Task 4: Gradient utility

**Files:**
- Create: `lib/gradient.ts`
- Create: `lib/__tests__/gradient.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/gradient.test.ts
import { getGradientStyle } from '../gradient'

it('returns a background style with linear-gradient', () => {
  const style = getGradientStyle('abc123')
  expect(style.background).toMatch(/linear-gradient/)
})

it('returns different gradients for different ids', () => {
  const a = getGradientStyle('id-one')
  const b = getGradientStyle('id-two')
  expect(a.background).not.toBe(b.background)
})

it('returns the same gradient for the same id', () => {
  expect(getGradientStyle('stable-id')).toEqual(getGradientStyle('stable-id'))
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- lib/__tests__/gradient.test.ts
```

Expected: FAIL — `Cannot find module '../gradient'`

- [ ] **Step 3: Implement lib/gradient.ts**

```ts
// lib/gradient.ts
export function getGradientStyle(id: string): { background: string } {
  const hash = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const hue1 = hash % 360
  const hue2 = (hue1 + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 60%, 40%), hsl(${hue2}, 60%, 25%))`,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- lib/__tests__/gradient.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/gradient.ts lib/__tests__/gradient.test.ts
git commit -m "feat: add deterministic gradient utility"
```

---

## Task 5: Wipe default Next.js styles and update root layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace globals.css with Tailwind directives only**

Overwrite the entire file:

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Replace app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Xtramile',
  description: 'Share your music',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f1a] text-white antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "chore: clean up default Next.js styles"
```

---

## Task 6: Root redirect page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
// app/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/tracks' : '/login')
    })
  }, [router])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: root page redirects based on auth session"
```

---

## Task 7: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/login/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react'
import LoginPage from '../page'

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

it('renders email and password inputs', () => {
  render(<LoginPage />)
  expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
})

it('renders Sign In and Sign Up toggle buttons', () => {
  render(<LoginPage />)
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- app/login/__tests__/page.test.tsx
```

Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Create app/login/page.tsx**

```tsx
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/tracks')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('Check your email to confirm your account, then sign in.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-2 text-center">🎵 Xtramile</h1>
        <p className="text-gray-500 text-sm text-center mb-8">Share your music</p>

        <div className="bg-[#1e1e30] rounded-2xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-purple-600 text-white' : 'bg-[#0f0f1a] text-gray-400'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-purple-600 text-white' : 'bg-[#0f0f1a] text-gray-400'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-[#0f0f1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#0f0f1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {message && <p className="text-green-400 text-sm">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- app/login/__tests__/page.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/login/__tests__/page.test.tsx
git commit -m "feat: add login/signup page"
```

---

## Task 8: TrackCard component

**Files:**
- Create: `components/TrackCard.tsx`
- Create: `components/__tests__/TrackCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/__tests__/TrackCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrackCard from '../TrackCard'
import { Track } from '../../lib/types'

const track: Track = {
  id: 'abc123',
  user_id: 'user1',
  title: 'Summer Vibes',
  file_path: 'user1/123-test.mp3',
  uploader_email: 'dante@example.com',
  created_at: '2026-01-01T00:00:00Z',
}

it('renders the track title', () => {
  render(<TrackCard track={track} isActive={false} isPlaying={false} onClick={() => {}} />)
  expect(screen.getByText('Summer Vibes')).toBeInTheDocument()
})

it('renders the uploader email prefix', () => {
  render(<TrackCard track={track} isActive={false} isPlaying={false} onClick={() => {}} />)
  expect(screen.getByText('dante')).toBeInTheDocument()
})

it('applies active ring when isActive is true', () => {
  const { container } = render(
    <TrackCard track={track} isActive={true} isPlaying={false} onClick={() => {}} />
  )
  expect(container.firstChild).toHaveClass('ring-2')
})

it('calls onClick when card is clicked', async () => {
  const onClick = jest.fn()
  render(<TrackCard track={track} isActive={false} isPlaying={false} onClick={onClick} />)
  await userEvent.click(screen.getByText('Summer Vibes'))
  expect(onClick).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Install missing test dep**

```bash
npm install --save-dev @testing-library/user-event
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- components/__tests__/TrackCard.test.tsx
```

Expected: FAIL — `Cannot find module '../TrackCard'`

- [ ] **Step 4: Create components/TrackCard.tsx**

```tsx
// components/TrackCard.tsx
'use client'

import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  track: Track
  isActive: boolean
  isPlaying: boolean
  onClick: () => void
}

export default function TrackCard({ track, isActive, isPlaying, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1e1e30] rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
        isActive ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      <div
        className="w-full aspect-square flex items-center justify-center text-3xl select-none"
        style={getGradientStyle(track.id)}
      >
        {isPlaying ? '▶' : '♪'}
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-semibold truncate">{track.title}</p>
        <p className="text-gray-500 text-xs mt-1 truncate">
          {track.uploader_email.split('@')[0]}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- components/__tests__/TrackCard.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add components/TrackCard.tsx components/__tests__/TrackCard.test.tsx
git commit -m "feat: add TrackCard component"
```

---

## Task 9: UploadModal component

**Files:**
- Create: `components/UploadModal.tsx`
- Create: `components/__tests__/UploadModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/__tests__/UploadModal.test.tsx
import { render, screen } from '@testing-library/react'
import UploadModal from '../UploadModal'

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn() })) },
    from: jest.fn(() => ({ insert: jest.fn() })),
  },
}))

it('renders the title input', () => {
  render(<UploadModal onClose={() => {}} onUploaded={() => {}} userEmail="test@example.com" />)
  expect(screen.getByPlaceholderText('Track title')).toBeInTheDocument()
})

it('renders upload and cancel buttons', () => {
  render(<UploadModal onClose={() => {}} onUploaded={() => {}} userEmail="test@example.com" />)
  expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
})

it('calls onClose when Cancel is clicked', async () => {
  const { default: userEvent } = await import('@testing-library/user-event')
  const onClose = jest.fn()
  render(<UploadModal onClose={onClose} onUploaded={() => {}} userEmail="test@example.com" />)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- components/__tests__/UploadModal.test.tsx
```

Expected: FAIL — `Cannot find module '../UploadModal'`

- [ ] **Step 3: Create components/UploadModal.tsx**

```tsx
// components/UploadModal.tsx
'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onUploaded: () => void
  userEmail: string
}

export default function UploadModal({ onClose, onUploaded, userEmail }: Props) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) {
      setError('Title and audio file are required.')
      return
    }
    setUploading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated.'); setUploading(false); return }

    const filePath = `${session.user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('audio').upload(filePath, file)
    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { error: insertError } = await supabase.from('tracks').insert({
      title: title.trim(),
      file_path: filePath,
      user_id: session.user.id,
      uploader_email: userEmail,
    })
    if (insertError) { setError(insertError.message); setUploading(false); return }

    onUploaded()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1e1e30] rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-white text-lg font-semibold mb-4">Upload Track</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full bg-[#0f0f1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Audio File</label>
            <input
              type="file"
              accept="audio/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-gray-400 text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#333] hover:bg-[#444] text-white py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- components/__tests__/UploadModal.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/UploadModal.tsx components/__tests__/UploadModal.test.tsx
git commit -m "feat: add UploadModal component"
```

---

## Task 10: PlayerBar component

**Files:**
- Create: `components/PlayerBar.tsx`
- Create: `components/__tests__/PlayerBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/__tests__/PlayerBar.test.tsx
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import PlayerBar from '../PlayerBar'
import { Track } from '../../lib/types'

const track: Track = {
  id: 'abc123',
  user_id: 'user1',
  title: 'Night Drive',
  file_path: 'user1/123-test.mp3',
  uploader_email: 'alex@example.com',
  created_at: '2026-01-01T00:00:00Z',
}

it('renders the track title', () => {
  const audioRef = createRef<HTMLAudioElement>()
  render(
    <PlayerBar
      track={track}
      isPlaying={false}
      audioRef={audioRef}
      onPlayPause={() => {}}
      onPrev={() => {}}
      onNext={() => {}}
    />
  )
  expect(screen.getByText('Night Drive')).toBeInTheDocument()
})

it('renders the uploader email prefix', () => {
  const audioRef = createRef<HTMLAudioElement>()
  render(
    <PlayerBar
      track={track}
      isPlaying={false}
      audioRef={audioRef}
      onPlayPause={() => {}}
      onPrev={() => {}}
      onNext={() => {}}
    />
  )
  expect(screen.getByText('alex')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- components/__tests__/PlayerBar.test.tsx
```

Expected: FAIL — `Cannot find module '../PlayerBar'`

- [ ] **Step 3: Create components/PlayerBar.tsx**

```tsx
// components/PlayerBar.tsx
'use client'

import { RefObject, useEffect, useState } from 'react'
import { Track } from '../lib/types'
import { getGradientStyle } from '../lib/gradient'

interface Props {
  track: Track
  isPlaying: boolean
  audioRef: RefObject<HTMLAudioElement>
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerBar({ track, isPlaying, audioRef, onPlayPause, onPrev, onNext }: Props) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function onTimeUpdate() {
      setProgress(audio!.duration ? (audio!.currentTime / audio!.duration) * 100 : 0)
      setCurrentTime(formatTime(audio!.currentTime))
    }
    function onLoadedMetadata() {
      setDuration(formatTime(audio!.duration))
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [audioRef])

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#13131f] border-t border-[#2a2a3e] px-5 py-3 flex items-center gap-5">
      <div
        className="w-11 h-11 rounded-md flex-shrink-0"
        style={getGradientStyle(track.id)}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{track.title}</p>
        <p className="text-gray-500 text-xs truncate">{track.uploader_email.split('@')[0]}</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onPrev} className="text-gray-400 hover:text-white text-lg">⏮</button>
        <button onClick={onPlayPause} className="text-white hover:text-purple-400 text-2xl">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} className="text-gray-400 hover:text-white text-lg">⏭</button>
      </div>
      <div className="flex flex-1 items-center gap-3 max-w-md">
        <span className="text-gray-500 text-xs w-8 text-right">{currentTime}</span>
        <div
          className="flex-1 h-1 bg-[#333] rounded cursor-pointer"
          onClick={handleSeek}
        >
          <div className="h-full bg-purple-500 rounded" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-gray-500 text-xs w-8">{duration}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- components/__tests__/PlayerBar.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/PlayerBar.tsx components/__tests__/PlayerBar.test.tsx
git commit -m "feat: add PlayerBar component"
```

---

## Task 11: Tracks page (wire everything together)

**Files:**
- Create: `app/tracks/page.tsx`

- [ ] **Step 1: Create app/tracks/page.tsx**

```tsx
// app/tracks/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Track } from '../../lib/types'
import TrackCard from '../../components/TrackCard'
import UploadModal from '../../components/UploadModal'
import PlayerBar from '../../components/PlayerBar'

export default function TracksPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    checkAuth()
    fetchTracks()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserEmail(session.user.email ?? null)
  }

  async function fetchTracks() {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setTracks(data as Track[])
  }

  function handleTrackClick(track: Track) {
    if (activeTrack?.id === track.id) {
      togglePlayPause()
      return
    }
    setActiveTrack(track)
    setIsPlaying(true)
  }

  function togglePlayPause() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(prev => !prev)
  }

  function handlePrev() {
    if (!activeTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === activeTrack.id)
    setActiveTrack(tracks[(idx - 1 + tracks.length) % tracks.length])
    setIsPlaying(true)
  }

  function handleNext() {
    if (!activeTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t.id === activeTrack.id)
    setActiveTrack(tracks[(idx + 1) % tracks.length])
    setIsPlaying(true)
  }

  useEffect(() => {
    if (!activeTrack || !audioRef.current) return
    const { data } = supabase.storage.from('audio').getPublicUrl(activeTrack.file_path)
    audioRef.current.src = data.publicUrl
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [activeTrack])

  return (
    <div className="min-h-screen bg-[#0f0f1a] pb-24">
      <nav className="bg-[#1a1a2e] border-b border-[#2a2a3e] px-6 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-lg">🎵 Xtramile</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpload(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Upload Track
          </button>
          <span className="text-gray-400 text-sm hidden sm:block">{userEmail}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="p-6">
        <h2 className="text-[#e0e0ff] text-xs uppercase tracking-widest mb-5">All Tracks</h2>
        {tracks.length === 0 ? (
          <p className="text-gray-600 text-sm">No tracks yet. Upload the first one!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                isActive={activeTrack?.id === track.id}
                isPlaying={isPlaying && activeTrack?.id === track.id}
                onClick={() => handleTrackClick(track)}
              />
            ))}
          </div>
        )}
      </main>

      <audio ref={audioRef} onEnded={handleNext} />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchTracks(); setShowUpload(false) }}
          userEmail={userEmail ?? ''}
        />
      )}

      {activeTrack && (
        <PlayerBar
          track={activeTrack}
          isPlaying={isPlaying}
          audioRef={audioRef}
          onPlayPause={togglePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all previously written tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/tracks/page.tsx
git commit -m "feat: add tracks page wiring grid, upload, and player"
```

---

## Task 12: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:3000.

- [ ] **Step 2: Verify redirect**

Visiting `/` should redirect to `/login` (no session yet).

- [ ] **Step 3: Sign up**

Fill in email + password, click Sign Up. You should see the "Check your email" confirmation message.

- [ ] **Step 4: Confirm email**

Open the confirmation link Supabase sends. Then sign in with the same credentials.

- [ ] **Step 5: Upload a track**

Click "Upload Track", enter a title, pick an audio file (`.mp3`, `.wav`, etc.), click Upload. The modal should close and the track should appear in the grid.

- [ ] **Step 6: Play the track**

Click the track card. The bottom player bar should appear, the audio should start playing. Verify prev/next and the seek bar work.

- [ ] **Step 7: Sign out**

Click "Sign out". Should redirect to `/login`.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: complete music sharing app POC"
```
