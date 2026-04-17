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
