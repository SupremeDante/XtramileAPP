import { supabase } from './supabase'

export type ThemePreference = 'light' | 'dark' | 'system'

export async function getTheme(userId: string): Promise<ThemePreference> {
  const { data } = await supabase
    .from('user_settings')
    .select('theme')
    .eq('user_id', userId)
    .single()
  return (data?.theme as ThemePreference) ?? 'system'
}

export async function saveTheme(userId: string, theme: ThemePreference): Promise<void> {
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, theme })
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', theme)
}
