'use server'

import { createClient } from '@/lib/supabase/server'

export interface SnapInput {
  time:          'short' | 'medium' | 'long'
  mood:          'relaxed' | 'energized' | 'sentimental' | 'intrigued'
  company:       'solo' | 'couple' | 'group'
  attempt:       number
  userPlatforms: string[]
  userGenres:    string[]
}

export interface SnapResult {
  title:        string
  type:         'movie' | 'series'
  poster_url:   string | null
  rating:       number
  release_year: number | null
  genres:       string[]
  platform:     string
  synopsis:     string
}

// ─── Mapeos ───────────────────────────────────────────────────────────────────

const MOOD_GENRES: Record<SnapInput['mood'], string[]> = {
  relaxed:     ['Comedia', 'Romance', 'Animación', 'Familia'],
  energized:   ['Acción', 'Action & Adventure', 'Aventura', 'Ciencia ficción', 'Sci-Fi & Fantasy'],
  sentimental: ['Drama', 'Romance'],
  intrigued:   ['Suspense', 'Crimen', 'Misterio'],
}

const EXCLUDE_COUPLE = ['Terror', 'War & Politics', 'Bélica']
const PREFER_COUPLE  = ['Romance', 'Drama', 'Comedia']
const PREFER_GROUP   = ['Comedia', 'Acción', 'Action & Adventure', 'Aventura']
const EXCLUDE_GROUP  = ['Drama']

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Parámetros RPC por tiempo ────────────────────────────────────────────────

function durationParams(time: SnapInput['time']): {
  p_min_duration: number | null
  p_max_duration: number | null
  p_type: string | null
} {
  if (time === 'short')  return { p_min_duration: null, p_max_duration: 90,  p_type: 'movie'  }
  if (time === 'medium') return { p_min_duration: 80,   p_max_duration: 140, p_type: 'movie'  }
  return                        { p_min_duration: 120,  p_max_duration: null, p_type: null     }
  // 'long': series no tiene duration_minutes fiable → se filtra por p_min_duration y la función
  // retornará tanto movies largas como series (p_type null = sin restricción de tipo)
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function getSnapResult(input: SnapInput): Promise<SnapResult | null> {
  const supabase = await createClient()

  const { time, mood, company, attempt, userPlatforms, userGenres } = input

  // DEBUG [1]
  console.log('[snap] input:', { time, mood, company, attempt, userPlatforms, userGenres })

  // ── Géneros según mood + intersección con preferencias del usuario ──────────
  const moodGenres    = MOOD_GENRES[mood]
  const matchedGenres = userGenres.filter((g) => moodGenres.includes(g))
  const genresToUse   = matchedGenres.length > 0 ? matchedGenres : moodGenres

  // DEBUG [2]
  console.log('[snap] moodGenres:', moodGenres)
  console.log('[snap] matchedGenres:', matchedGenres)
  console.log('[snap] genresToUse:', genresToUse)

  const dur = durationParams(time)
  console.log('[snap] duración params:', dur)

  // ── Llamadas RPC por attempt ────────────────────────────────────────────────
  let data: SnapResult[] | null = null

  if (attempt <= 2) {
    let genreFilter = genresToUse
    if (company === 'couple') {
      genreFilter = [...new Set([...genreFilter, ...PREFER_COUPLE])].filter((g) => !EXCLUDE_COUPLE.includes(g))
    } else if (company === 'group') {
      genreFilter = [...new Set([...genreFilter, ...PREFER_GROUP])].filter((g) => !EXCLUDE_GROUP.includes(g))
    }

    const { data: rows, error } = await supabase.rpc('get_snap_titles', {
      p_platforms:    userPlatforms,
      p_genres:       genreFilter,
      p_min_duration: dur.p_min_duration,
      p_max_duration: dur.p_max_duration,
      p_type:         dur.p_type,
      p_min_rating:   6.0,
      p_order_by:     attempt === 1 ? 'rating' : 'year',
      p_limit:        10,
    })

    if (error) console.error('[snap] rpc error:', error.message)
    data = rows
    console.log(`[snap] attempt ${attempt}: ${rows?.length ?? 0} resultados`)

  } else if (attempt === 3) {
    const { data: rows, error } = await supabase.rpc('get_snap_titles', {
      p_platforms:    userPlatforms,
      p_genres:       null,
      p_min_duration: dur.p_min_duration,
      p_max_duration: dur.p_max_duration,
      p_type:         dur.p_type,
      p_min_rating:   7.0,
      p_order_by:     'rating',
      p_limit:        5,
    })

    if (error) console.error('[snap] rpc error:', error.message)
    data = rows
    console.log(`[snap] attempt 3: ${rows?.length ?? 0} resultados (sin géneros, rating >= 70)`)

  } else {
    // Attempt 4+: sin filtros de géneros ni duración
    const { data: rows, error } = await supabase.rpc('get_snap_titles', {
      p_platforms:    userPlatforms,
      p_genres:       null,
      p_min_duration: null,
      p_max_duration: null,
      p_type:         null,
      p_min_rating:   5.0,
      p_order_by:     'rating',
      p_limit:        50,
    })

    if (error) console.error('[snap] rpc error:', error.message)
    data = rows
    console.log(`[snap] attempt ${attempt} (random): ${rows?.length ?? 0} resultados`)
  }

  if (!data || data.length === 0) return null

  const picked = pickRandom(data)
  console.log('[snap] resultado seleccionado:', picked.title)

  return {
    title:        picked.title,
    type:         picked.type as 'movie' | 'series',
    poster_url:   picked.poster_url,
    rating:       picked.rating,
    release_year: picked.release_year,
    genres:       picked.genres ?? [],
    synopsis:     picked.synopsis,
    platform:     picked.platform ?? '',
  }
}
