'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface PickTitle {
  id:           string
  title:        string
  type:         'movie' | 'series'
  poster_url:   string | null
  rating:       number
  release_year: number | null
  genres:       string[]
  platform:     string
  synopsis:     string
}

function genCode(): string {
  return Array.from({ length: 4 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  ).join('')
}

export async function createSession(): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('platforms')
    .eq('user_id', user.id)
    .single()

  const { data: titles, error: rpcError } = await supabase.rpc('get_pick_titles', {
    p_platforms:  prefs?.platforms ?? [],
    p_min_rating: 6.0,
    p_limit:      20,
  })

  if (rpcError) return { error: rpcError.message }

  const titleIds = (titles as PickTitle[] ?? []).map((t) => t.id)

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({ code: genCode(), created_by: user.id, title_ids: titleIds })
    .select('id')
    .single()

  if (sessionError) return { error: sessionError.message }

  await supabase
    .from('session_participants')
    .insert({ session_id: session.id, user_id: user.id })

  redirect(`/pick/${session.id}`)
}

export async function joinSession(code: string): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!session) return { error: 'Sala no encontrada. Verifica el código.' }

  await supabase
    .from('session_participants')
    .upsert(
      { session_id: session.id, user_id: user.id },
      { onConflict: 'session_id,user_id' }
    )

  redirect(`/pick/${session.id}`)
}

export async function submitVote(
  sessionId: string,
  titleId:   string,
  vote:      boolean
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('session_votes').upsert(
    { session_id: sessionId, title_id: titleId, user_id: user.id, vote },
    { onConflict: 'session_id,title_id,user_id' }
  )
}
