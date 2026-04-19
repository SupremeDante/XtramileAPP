import { render, screen } from '@testing-library/react'
import FolderCard from '../FolderCard'
import { Folder, Track } from '../../lib/types'

const folder: Folder = {
  id: 'folder1',
  user_id: 'user1',
  name: 'My Beats',
  created_at: '2026-01-01T00:00:00Z',
}

const makeTrack = (id: string, cover_url?: string): Track => ({
  id,
  user_id: 'user1',
  title: `Track ${id}`,
  file_path: `user1/${id}.mp3`,
  uploader_email: 'user@example.com',
  created_at: '2026-01-01T00:00:00Z',
  cover_url: cover_url ?? null,
})

const baseProps = {
  folder,
  trackCount: 0,
  folderTracks: [],
  onClick: jest.fn(),
  onRename: jest.fn(),
  onDelete: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

it('renders the folder name', () => {
  render(<FolderCard {...baseProps} />)
  expect(screen.getByText('My Beats')).toBeInTheDocument()
})

it('shows emoji placeholder when folder is empty', () => {
  render(<FolderCard {...baseProps} />)
  expect(screen.getByText('📁')).toBeInTheDocument()
})

it('renders a single cover image when folder has 1 track with cover_url', () => {
  const tracks = [makeTrack('t1', 'https://example.com/cover1.jpg')]
  render(<FolderCard {...baseProps} trackCount={1} folderTracks={tracks} />)
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/cover1.jpg')
})

it('renders 2 tiles when folder has 2 tracks', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/c1.jpg'),
    makeTrack('t2', 'https://example.com/c2.jpg'),
  ]
  render(<FolderCard {...baseProps} trackCount={2} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')).toHaveLength(2)
})

it('renders 4 tiles when folder has 4 tracks', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/c1.jpg'),
    makeTrack('t2', 'https://example.com/c2.jpg'),
    makeTrack('t3', 'https://example.com/c3.jpg'),
    makeTrack('t4', 'https://example.com/c4.jpg'),
  ]
  render(<FolderCard {...baseProps} trackCount={4} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')).toHaveLength(4)
})

it('shows full-bleed first track cover with badge when folder has 5+ tracks', () => {
  const tracks = Array.from({ length: 6 }, (_, i) =>
    makeTrack(`t${i}`, `https://example.com/c${i}.jpg`)
  )
  render(<FolderCard {...baseProps} trackCount={6} folderTracks={tracks} />)
  const imgs = screen.getAllByRole('img')
  expect(imgs).toHaveLength(1)
  expect(imgs[0]).toHaveAttribute('src', 'https://example.com/c0.jpg')
  expect(screen.getAllByText('6 tracks')).toHaveLength(2)
})

it('shows drop target overlay when isDropTarget is true', () => {
  render(<FolderCard {...baseProps} isDropTarget />)
  expect(screen.getByText('Add to folder')).toBeInTheDocument()
})
