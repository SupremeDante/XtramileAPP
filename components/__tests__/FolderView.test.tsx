import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FolderView from '../FolderView'
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
  folderTracks: [],
  activeTrack: null,
  onTrackClick: jest.fn(),
  onBack: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

it('renders the back button', () => {
  render(<FolderView {...baseProps} />)
  expect(screen.getByText('← Back')).toBeInTheDocument()
})

it('calls onBack when back button is clicked', async () => {
  render(<FolderView {...baseProps} />)
  await userEvent.click(screen.getByText('← Back'))
  expect(baseProps.onBack).toHaveBeenCalledTimes(1)
})

it('shows empty state when folder has no tracks', () => {
  render(<FolderView {...baseProps} />)
  expect(screen.getByText('This folder is empty.')).toBeInTheDocument()
})

it('renders all track titles in the list', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2'), makeTrack('t3')]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  expect(screen.getByText('Track t1')).toBeInTheDocument()
  expect(screen.getByText('Track t2')).toBeInTheDocument()
  expect(screen.getByText('Track t3')).toBeInTheDocument()
})

it('shows the first track cover in the left panel by default', () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/cover1.jpg'),
    makeTrack('t2', 'https://example.com/cover2.jpg'),
  ]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'https://example.com/cover1.jpg')
})

it('calls onTrackClick when a track row is clicked', async () => {
  const onTrackClick = jest.fn()
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} onTrackClick={onTrackClick} />)
  await userEvent.click(screen.getByText('Track t2'))
  expect(onTrackClick).toHaveBeenCalledWith(tracks[1])
})

it('updates the left panel cover when a track row is clicked', async () => {
  const tracks = [
    makeTrack('t1', 'https://example.com/cover1.jpg'),
    makeTrack('t2', 'https://example.com/cover2.jpg'),
  ]
  render(<FolderView {...baseProps} folderTracks={tracks} />)
  await userEvent.click(screen.getByText('Track t2'))
  expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'https://example.com/cover2.jpg')
})

it('applies active ring to the currently playing track row', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} activeTrack={tracks[0]} />)
  expect(screen.getByText('Track t1').closest('button')).toHaveClass('ring-2')
})

it('does not apply active ring to a non-playing track row', () => {
  const tracks = [makeTrack('t1'), makeTrack('t2')]
  render(<FolderView {...baseProps} folderTracks={tracks} activeTrack={tracks[0]} />)
  expect(screen.getByText('Track t2').closest('button')).not.toHaveClass('ring-2')
})
