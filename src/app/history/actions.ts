'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addToWatchlist(titleId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('user_titles').upsert(
    { user_id: user.id, title_id: titleId, status: 'watchlist' },
    { onConflict: 'user_id,title_id' }
  )
  revalidatePath('/history')
}

export async function markAsWatched(titleId: string, rating?: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('user_titles').upsert(
    {
      user_id:    user.id,
      title_id:   titleId,
      status:     'watched',
      rating:     rating ?? null,
      watched_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,title_id' }
  )
  revalidatePath('/history')
}

export async function updateRating(titleId: string, rating: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_titles')
    .update({ rating })
    .eq('user_id', user.id)
    .eq('title_id', titleId)

  revalidatePath('/history')
}

export async function removeFromList(titleId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_titles')
    .delete()
    .eq('user_id', user.id)
    .eq('title_id', titleId)

  revalidatePath('/history')
}
