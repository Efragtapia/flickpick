'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function savePreferences(platforms: string[], genres: string[]) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/auth/login')

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, platforms, genres }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)

  redirect('/dashboard')
}
