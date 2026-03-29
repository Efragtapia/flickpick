#!/usr/bin/env node
/**
 * Seed script: puebla `titles` y `title_availability` en Supabase
 * Ejecutar con: npx ts-node src/lib/catalog/seed.ts
 *
 * Fuentes:
 *   - Streaming Availability API (RapidAPI) → plataformas disponibles en MX
 *   - TMDB API → metadata completa (poster, sinopsis, géneros, rating, etc.)
 */

import fs from 'fs'
import path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Cargar .env.local ────────────────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.warn('[env] .env.local no encontrado, usando variables del sistema')
    return
  }
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

// ─── Configuración ────────────────────────────────────────────────────────────

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ADMIN_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TMDB_API_KEY        = process.env.NEXT_PUBLIC_TMDB_API_KEY!
const RAPIDAPI_KEY        = process.env.RAPIDAPI_KEY!

const SA_BASE         = 'https://streaming-availability.p.rapidapi.com'
const TMDB_BASE       = 'https://api.themoviedb.org/3'
const TMDB_IMG_BASE   = 'https://image.tmdb.org/t/p/w780'

const COUNTRY    = 'mx'
const PLATFORMS  = 'netflix,disney,hbo,prime,apple'
const BATCH_SIZE = 20
const DELAY_MS   = 1000
const SA_LIMIT   = 100   // límite diario RapidAPI

// ─── Tipos de API ─────────────────────────────────────────────────────────────

interface StreamingEntry {
  service:        { id: string; name: string }
  type:           string
  link:           string
  availableSince?: number
  leavingDate?:   number
}

// Forma cruda devuelta por la API
interface SAShowRaw {
  tmdbId:           string   // e.g. "movie/575604" | "tv/70593"
  title:            string
  showType:         string
  streamingOptions: Record<string, StreamingEntry[]>
}

interface SAPageRaw {
  shows:       SAShowRaw[]
  nextCursor?: string
}

// Forma normalizada usada internamente
interface SAShow {
  tmdbId:           number
  title:            string
  showType:         'movie' | 'series'
  streamingOptions: Record<string, StreamingEntry[]>
}

interface SAPage {
  shows:       SAShow[]
  nextCursor?: string
}

interface TMDBBase {
  id:            number
  overview:      string
  poster_path:   string | null
  backdrop_path: string | null
  genres:        { id: number; name: string }[]
  vote_average:  number
}

interface TMDBMovie extends TMDBBase {
  title:        string
  release_date: string
  runtime:      number | null
}

interface TMDBSeries extends TMDBBase {
  name:             string
  first_air_date:   string
  episode_run_time: number[]
}

// ─── Tipos de base de datos ───────────────────────────────────────────────────

interface TitleRow {
  tmdb_id:          number
  type:             'movie' | 'series'
  title:            string
  synopsis:         string
  poster_url:       string | null
  backdrop_url:     string | null
  genres:           string[]
  rating:           number
  release_year:     number | null
  duration_minutes: number | null
}

interface AvailabilityRow {
  title_id:       string
  platform:       string
  country:        string
  available_from: string | null
  available_until: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function fetchSAPage(cursor?: string): Promise<SAPage> {
  const params = new URLSearchParams({ country: COUNTRY, catalogs: PLATFORMS, output_language: 'en' })
  if (cursor) params.set('cursor', cursor)

  const res = await fetch(`${SA_BASE}/shows/search/filters?${params}`, {
    headers: {
      'X-RapidAPI-Key':  RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
    },
  })
  if (!res.ok) throw new Error(`Streaming Availability ${res.status}: ${await res.text()}`)

  const raw = await res.json() as SAPageRaw
  return {
    nextCursor: raw.nextCursor,
    shows: raw.shows.map((s) => {
      const [prefix, idStr] = s.tmdbId.split('/')
      return {
        title:            s.title,
        tmdbId:           parseInt(idStr, 10),
        showType:         prefix === 'movie' ? 'movie' : 'series',
        streamingOptions: s.streamingOptions,
      }
    }),
  }
}

async function fetchTMDB(tmdbId: number, type: 'movie' | 'series'): Promise<TMDBMovie | TMDBSeries | null> {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const res = await fetch(`${TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()} (id: ${tmdbId})`)
  return res.json() as Promise<TMDBMovie | TMDBSeries>
}

function toTitleRow(show: SAShow, tmdb: TMDBMovie | TMDBSeries): TitleRow {
  const isMovie = show.showType === 'movie'
  const movie   = tmdb as TMDBMovie
  const series  = tmdb as TMDBSeries

  const rawDate = isMovie ? movie.release_date : series.first_air_date
  const year    = rawDate ? parseInt(rawDate.slice(0, 4), 10) : null
  const duration = isMovie ? (movie.runtime ?? null) : (series.episode_run_time?.[0] ?? null)

  return {
    tmdb_id:          tmdb.id,
    type:             show.showType,
    title:            isMovie ? movie.title : series.name,
    synopsis:         tmdb.overview ?? '',
    poster_url:       tmdb.poster_path   ? `${TMDB_IMG_BASE}${tmdb.poster_path}`   : null,
    backdrop_url:     tmdb.backdrop_path ? `${TMDB_IMG_BASE}${tmdb.backdrop_path}` : null,
    genres:           tmdb.genres.map((g) => g.name),
    rating:           parseFloat(tmdb.vote_average.toFixed(1)),
    release_year:     year,
    duration_minutes: duration,
  }
}

function toAvailabilityRows(show: SAShow, titleId: string): AvailabilityRow[] {
  const entries: StreamingEntry[] = show.streamingOptions[COUNTRY] ?? []
  const seen = new Set<string>()
  return entries
    .map((e) => ({
      title_id:        titleId,
      platform:        e.service.id,
      country:         COUNTRY,
      available_from:  e.availableSince ? new Date(e.availableSince * 1000).toISOString() : null,
      available_until: e.leavingDate    ? new Date(e.leavingDate    * 1000).toISOString() : null,
    }))
    .filter((row) => {
      const key = `${row.title_id}|${row.platform}|${row.country}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// ─── Procesamiento por título ─────────────────────────────────────────────────

async function processShow(
  show: SAShow,
  supabase: SupabaseClient,
  stats: { processed: number; skipped: number; errors: number },
): Promise<void> {
  try {
    const tmdb = await fetchTMDB(show.tmdbId, show.showType)
    if (!tmdb) {
      console.log(`  ⚠ TMDB no encontrado: "${show.title}" (tmdb_id: ${show.tmdbId})`)
      stats.skipped++
      return
    }

    const titleRow = toTitleRow(show, tmdb)

    // Upsert en `titles` (conflict: tmdb_id)
    const { data: upserted, error: titleErr } = await supabase
      .from('titles')
      .upsert(titleRow, { onConflict: 'tmdb_id' })
      .select('id')
      .single()

    if (titleErr) throw new Error(`titles upsert: ${titleErr.message}`)

    // Upsert en `title_availability` (conflict: title_id, platform, country)
    const availRows = toAvailabilityRows(show, upserted.id)
    if (availRows.length > 0) {
      const { error: availErr } = await supabase
        .from('title_availability')
        .upsert(availRows, { onConflict: 'title_id,platform,country' })
      if (availErr) throw new Error(`title_availability upsert: ${availErr.message}`)
    }

    stats.processed++
    console.log(`  ✓ [${show.showType}] ${titleRow.title} (${titleRow.release_year ?? '?'}) — ${availRows.length} plataforma(s)`)
  } catch (err) {
    stats.errors++
    console.error(`  ✗ "${show.title}":`, (err as Error).message)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isPilot = process.argv.includes('--pilot')

  // Validar env vars
  const required: [string, string][] = [
    ['NEXT_PUBLIC_SUPABASE_URL',   SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY',  SUPABASE_ADMIN_KEY],
    ['NEXT_PUBLIC_TMDB_API_KEY',   TMDB_API_KEY],
    ['RAPIDAPI_KEY',               RAPIDAPI_KEY],
  ]
  const missing = required.filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    console.error('Variables de entorno faltantes:', missing.join(', '))
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY)
  const stats    = { processed: 0, skipped: 0, errors: 0 }

  console.log('╔══════════════════════════════════╗')
  console.log(isPilot
    ? '║  FlickPick — Catalog Seed (PILOT) ║'
    : '║    FlickPick — Catalog Seed       ║')
  console.log('╚══════════════════════════════════╝')
  console.log(`País:        ${COUNTRY.toUpperCase()}`)
  console.log(`Plataformas: ${PLATFORMS}`)
  console.log(`Lote:        ${BATCH_SIZE} títulos | delay: ${DELAY_MS}ms`)
  console.log(`Límite SA:   ${SA_LIMIT} llamadas/día`)
  if (isPilot) console.log('Modo:        PILOTO (1 página SA, 3 títulos)\n')
  else         console.log()

  // 1. Recolectar títulos de Streaming Availability
  console.log('── Fase 1: Streaming Availability API ──')
  const allShows: SAShow[] = []
  let cursor: string | undefined
  let saCallCount = 0

  do {
    if (saCallCount >= SA_LIMIT) {
      console.warn(`\nLímite de ${SA_LIMIT} llamadas alcanzado. Continuando con ${allShows.length} títulos.`)
      break
    }
    const page = await fetchSAPage(cursor)
    allShows.push(...page.shows)
    cursor = page.nextCursor
    saCallCount++
    console.log(`  Página ${saCallCount}: +${page.shows.length} títulos (acumulado: ${allShows.length})`)
    if (isPilot) break   // modo piloto: solo 1 página
    if (cursor) await delay(DELAY_MS)
  } while (cursor)

  console.log(`\nTotal: ${allShows.length} títulos | ${saCallCount}/${SA_LIMIT} llamadas SA usadas`)

  // 2. Procesar en lotes: TMDB + Supabase upsert
  console.log('\n── Fase 2: TMDB + Supabase ──')
  const showsToProcess = isPilot ? allShows.slice(0, 3) : allShows
  const totalBatches   = Math.ceil(showsToProcess.length / BATCH_SIZE)

  for (let i = 0; i < showsToProcess.length; i += BATCH_SIZE) {
    const batch  = showsToProcess.slice(i, i + BATCH_SIZE)
    const batchN = Math.floor(i / BATCH_SIZE) + 1
    console.log(`\nLote ${batchN}/${totalBatches} (${i + 1}–${i + batch.length}):`)

    for (const show of batch) {
      await processShow(show, supabase, stats)
    }

    if (i + BATCH_SIZE < showsToProcess.length) await delay(DELAY_MS)
  }

  // Resumen final
  console.log('\n╔══════════════════════════════════╗')
  console.log('║           Resultado               ║')
  console.log('╚══════════════════════════════════╝')
  console.log(`  ✓ Procesados:  ${stats.processed}`)
  console.log(`  ⚠ Omitidos:   ${stats.skipped}`)
  console.log(`  ✗ Errores:    ${stats.errors}`)
  console.log(`  Total lotes:  ${totalBatches}`)
  console.log(`  Llamadas SA:  ${saCallCount}/${SA_LIMIT}`)
}

main().catch((err) => {
  console.error('\nError fatal:', err)
  process.exit(1)
})
