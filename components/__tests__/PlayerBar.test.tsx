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
