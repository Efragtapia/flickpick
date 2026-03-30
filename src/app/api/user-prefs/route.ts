import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ platforms: [], genres: [] })

  const { data } = await supabase
    .from('user_preferences')
    .select('platforms, genres')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    platforms: data?.platforms ?? [],
    genres:    data?.genres    ?? [],
  })
}
