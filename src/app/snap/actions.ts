'use server'

import { createClient } from '@/lib/supabase/server'

export interface SnapInput {
  time:          'short' | 'medium' | 'long'
  mood:          'relaxed' | 'energized' | 'sentimental' | 'intrigued'
  company:       'solo' | 'couple' | 'group'
  mediaType:     'movie' | 'series' | null
  attempt:       number
  shownIds:      string[]
  userPlatforms: string[]
  userGenres:    string[]
}

export interface SnapResult {
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

function pickFromTop<T extends { rating: number }>(arr: T[]): T {
  const sorted = [...arr].sort((a, b) => b.rating - a.rating)
  const top    = sorted.slice(0, 5)
  return top[Math.floor(Math.random() * top.length)]
}

// ─── Parámetros por grupo de intentos ────────────────────────────────────────

function attemptParams(attempt: number): { minRating: number | null; minYear: number | null } {
  if (attempt <=  5) return { minRating: 7.5, minYear: 2019 }
  if (attempt <= 15) return { minRating: 7.0, minYear: 2014 }
  if (attempt <= 25) return { minRating: 6.5, minYear: 2009 }
  if (attempt <= 35) return { minRating: 6.0, minYear: null }
  return               { minRating: null,  minYear: null  }
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

  const { time, mood, company, mediaType, attempt, shownIds, userPlatforms, userGenres } = input

  console.log('[snap] input:', { time, mood, company, attempt, shownIds: shownIds.length, userPlatforms, userGenres })

  // ── Géneros según mood + intersección con preferencias del usuario ──────────
  const moodGenres    = MOOD_GENRES[mood]
  const matchedGenres = userGenres.filter((g) => moodGenres.includes(g))
  const genresToUse   = matchedGenres.length > 0 ? matchedGenres : moodGenres

  console.log('[snap] genresToUse:', genresToUse)

  // ── Géneros + company (aplica siempre, no se relajan por attempt) ───────────
  let genreFilter = genresToUse
  if (company === 'couple') {
    genreFilter = [...new Set([...genreFilter, ...PREFER_COUPLE])].filter((g) => !EXCLUDE_COUPLE.includes(g))
  } else if (company === 'group') {
    genreFilter = [...new Set([...genreFilter, ...PREFER_GROUP])].filter((g) => !EXCLUDE_GROUP.includes(g))
  }

  const dur   = durationParams(time)
  // mediaType del usuario tiene prioridad; si es null (Sorpréndeme) se respeta el p_type de duración
  const pType = mediaType ?? dur.p_type
  console.log('[snap] pType:', pType)

  const { minRating, minYear } = attemptParams(attempt)
  console.log(`[snap] attempt ${attempt}: minRating=${minRating}, minYear=${minYear}`)

  // ── Una sola llamada RPC ───────────────────────────────────────────────────
  const { data: rows, error } = await supabase.rpc('get_snap_titles', {
    p_platforms:    userPlatforms,
    p_genres:       genreFilter,
    p_min_duration: dur.p_min_duration,
    p_max_duration: dur.p_max_duration,
    p_type:         pType,
    p_min_rating:   minRating,
    p_order_by:     'rating',
    p_limit:        50,
  })

  if (error) console.error('[snap] rpc error:', error.message)
  let data: SnapResult[] = rows ?? []
  console.log(`[snap] rpc resultados: ${data.length}`)

  // ── Filtro de año en TypeScript ────────────────────────────────────────────
  if (minYear !== null) {
    data = data.filter((r) => r.release_year !== null && r.release_year >= minYear)
    console.log(`[snap] post-year (>= ${minYear}): ${data.length}`)
  }

  // ── Anti-repetición ────────────────────────────────────────────────────────
  if (shownIds.length > 0) {
    data = data.filter((r) => !shownIds.includes(r.id))
    console.log(`[snap] post-shownIds: ${data.length}`)
  }

  if (data.length === 0) return null

  const picked = pickFromTop(data)
  console.log('[snap] resultado seleccionado:', picked.title)

  return {
    id:           picked.id,
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
