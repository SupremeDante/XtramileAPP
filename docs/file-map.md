# File Map

## app/

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — metadata, globals.css |
| `app/globals.css` | Tailwind directives + CSS custom properties (dark/light theme vars) |
| `app/page.tsx` | Auth redirect only — no UI |
| `app/login/page.tsx` | Sign in / sign up form |
| `app/tracks/page.tsx` | Main page — all state, audio, DnD (DnD not yet wired) |

## components/

| File | Purpose |
|------|---------|
| `components/TrackCard.tsx` | Grid card — `useSortable`, drag on artwork, menu, active/folder rings |
| `components/FolderCard.tsx` | Grid card for folders — click to open, track count |
| `components/FolderModal.tsx` | **DOES NOT EXIST** — modal to view/drag tracks out of a folder |
| `components/PlayerBar.tsx` | Fixed bottom bar — seek, prev/next/play, time display |
| `components/TrackMenu.tsx` | Context menu — all track actions, audio analysis, offline |
| `components/UploadModal.tsx` | Upload modal — title input, file picker, Supabase Storage upload |

## lib/

| File | Purpose |
|------|---------|
| `lib/types.ts` | `Track` and `Folder` interfaces |
| `lib/supabase.ts` | Singleton Supabase client |
| `lib/gradient.ts` | Deterministic gradient from track ID (hash → HSL) |
| `lib/theme.ts` | `getTheme`, `saveTheme`, `applyTheme` — Supabase + data-theme attr |
| `lib/profile.ts` | `getProfile`, `createProfile`, `getAvatarColor` |

## Tests

| File | Coverage |
|------|---------|
| `lib/__tests__/gradient.test.ts` | Determinism, uniqueness |
| `app/login/__tests__/page.test.tsx` | Renders inputs, toggle buttons |
| `components/__tests__/TrackCard.test.tsx` | Renders title, email, active ring, click |
| `components/__tests__/PlayerBar.test.tsx` | Renders title, email |
| `components/__tests__/UploadModal.test.tsx` | Renders inputs, cancel callback |

## Config

| File | Purpose |
|------|---------|
| `next.config.ts` | Minimal Next.js config |
| `postcss.config.mjs` | Tailwind PostCSS |
| `tsconfig.json` | Strict TS, `@/*` path alias |
| `jest.config.js` | jsdom env, nextJest wrapper |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
