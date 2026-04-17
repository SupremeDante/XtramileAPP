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
