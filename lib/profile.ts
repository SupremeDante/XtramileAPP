import { supabase } from './supabase'

export interface Profile {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function createProfile(userId: string, displayName: string, handle: string): Promise<void> {
  await supabase.from('profiles').insert({
    id: userId,
    display_name: displayName.trim(),
    handle: handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
  })
}

export function getAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`
}
