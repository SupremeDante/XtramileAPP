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
              aria-label={loading ? 'Loading...' : mode === 'signin' ? 'Submit Sign In' : 'Submit Sign Up'}
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
