import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  const onClose = jest.fn()
  render(<UploadModal onClose={onClose} onUploaded={() => {}} userEmail="test@example.com" />)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
