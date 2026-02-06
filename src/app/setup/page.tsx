'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    // Step 1: Try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Step 2: Sign in to establish a session (needed for RLS)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Sign-in failed: ' + signInError.message + '. If email confirmation is required, check your Supabase Auth settings and disable "Confirm email".')
      setLoading(false)
      return
    }

    const userId = signInData.user?.id || signUpData?.user?.id
    if (!userId) {
      setError('Failed to get user ID')
      setLoading(false)
      return
    }

    // Step 3: Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      setMessage('Owner account already exists! You can sign in now.')
      setLoading(false)
      return
    }

    // Step 4: Insert profile (now authenticated, RLS will allow id = auth.uid())
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'owner',
      })

    if (profileError) {
      setError('Profile creation failed: ' + profileError.message)
      setLoading(false)
      return
    }

    setMessage('Owner account created! You can now sign in.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">VVS1 Setup</h1>
        <p className="text-white/50 text-sm mb-6">Create the Owner account. Only use this once.</p>

        <form onSubmit={handleCreate} className="glass-card p-6 md:p-8 shadow-2xl shadow-indigo-500/5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="glass-input"
              placeholder="Min 8 characters"
            />
          </div>

          {error && (
            <div className="p-3 glass-card border-red-400/25">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 glass-card border-emerald-400/25">
              <p className="text-sm text-emerald-300">{message}</p>
              <a href="/login" className="text-sm text-indigo-400 underline mt-2 inline-block">Go to Login</a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? 'Creating...' : 'Create Owner Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
