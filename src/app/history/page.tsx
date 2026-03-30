import { Nunito } from 'next/font/google'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markAsWatched, removeFromList } from './actions'
import RatingStars from './components/RatingStars'

const nunito = Nunito({ subsets: ['latin'] })

const PLATFORM_LABELS: Record<string, string> = {
  netflix: 'Netflix',
  disney:  'Disney+',
  hbo:     'HBO Max',
  prime:   'Prime Video',
  apple:   'Apple TV+',
}

type Tab = 'watched' | 'watchlist' | 'stats'

interface TitleRow {
  id:           string
  title:        string
  type:         string
  poster_url:   string | null
  release_year: number | null
  genres:       string[]
}

interface WatchedRow {
  title_id:  string
  rating:    number | null
  watched_at: string | null
  titles:    TitleRow
}

interface WatchlistRow {
  title_id: string
  titles:   TitleRow
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Tabs nav ─────────────────────────────────────────────────────────────────

function TabNav({ active }: { active: Tab }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'watched',   label: 'Visto'       },
    { key: 'watchlist', label: 'Ver después' },
    { key: 'stats',     label: 'Stats'       },
  ]
  return (
    <div className="mb-6 flex border-b" style={{ borderColor: '#1A1A1A' }}>
      {tabs.map(({ key, label }) => (
        <Link
          key={key}
          href={`?tab=${key}`}
          className="pb-3 pr-6 text-sm font-bold transition-colors"
          style={{
            color:        active === key ? '#fff' : '#666',
            borderBottom: active === key ? '2px solid #FF3B5C' : '2px solid transparent',
          }}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

// ─── Card — Visto ─────────────────────────────────────────────────────────────

function WatchedCard({ row }: { row: WatchedRow }) {
  const t = row.titles
  return (
    <div
      className="flex gap-4 rounded-xl p-3"
      style={{ background: '#111', border: '1px solid #1E1E1E' }}
    >
      {/* Poster */}
      {t.poster_url ? (
        <img
          src={t.poster_url}
          alt={t.title}
          className="flex-shrink-0 rounded-lg object-cover"
          style={{ width: '60px', height: '90px' }}
        />
      ) : (
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ width: '60px', height: '90px', background: '#1A1A1A' }}
        >
          🎬
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <p className="text-sm font-extrabold leading-tight text-white">{t.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#666' }}>
            {t.release_year ?? '—'} · {t.type === 'movie' ? 'Película' : 'Serie'}
          </p>
        </div>

        <RatingStars titleId={row.title_id} currentRating={row.rating} />

        <p className="text-xs" style={{ color: '#555' }}>
          Visto el {formatDate(row.watched_at)}
        </p>
      </div>

      {/* Eliminar */}
      <form action={removeFromList.bind(null, row.title_id)}>
        <button
          type="submit"
          className="self-start text-sm transition-opacity hover:opacity-70"
          style={{ color: '#444' }}
        >
          ✕
        </button>
      </form>
    </div>
  )
}

// ─── Card — Watchlist ─────────────────────────────────────────────────────────

function WatchlistCard({ row }: { row: WatchlistRow }) {
  const t = row.titles
  return (
    <div
      className="flex gap-4 rounded-xl p-3"
      style={{ background: '#111', border: '1px solid #1E1E1E' }}
    >
      {/* Poster */}
      {t.poster_url ? (
        <img
          src={t.poster_url}
          alt={t.title}
          className="flex-shrink-0 rounded-lg object-cover"
          style={{ width: '60px', height: '90px' }}
        />
      ) : (
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ width: '60px', height: '90px', background: '#1A1A1A' }}
        >
          🎬
        </div>
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <p className="text-sm font-extrabold leading-tight text-white">{t.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#666' }}>
            {t.release_year ?? '—'} · {t.type === 'movie' ? 'Película' : 'Serie'}
          </p>
          {t.genres.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: '#555' }}>
              {t.genres.slice(0, 2).join(' · ')}
            </p>
          )}
        </div>

        <form action={markAsWatched.bind(null, row.title_id, undefined)}>
          <button
            type="submit"
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
            style={{ background: '#FF3B5C' }}
          >
            ✓ Ya la vi
          </button>
        </form>
      </div>

      {/* Eliminar */}
      <form action={removeFromList.bind(null, row.title_id)}>
        <button
          type="submit"
          className="self-start text-sm transition-opacity hover:opacity-70"
          style={{ color: '#444' }}
        >
          ✕
        </button>
      </form>
    </div>
  )
}

// ─── Tab Stats ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl py-5"
      style={{ background: '#111', border: '1px solid #1E1E1E' }}
    >
      <span className="text-3xl font-extrabold text-white">{value}</span>
      <span className="text-xs font-semibold" style={{ color: '#666' }}>{label}</span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { tab: tabParam } = await searchParams
  const tab: Tab = (tabParam === 'watchlist' || tabParam === 'stats')
    ? tabParam
    : 'watched'

  // ── Watched ──────────────────────────────────────────────────────────────────
  const { data: watchedRaw } = await supabase
    .from('user_titles')
    .select('title_id, rating, watched_at, titles ( id, title, type, poster_url, release_year, genres )')
    .eq('user_id', user.id)
    .eq('status', 'watched')
    .order('watched_at', { ascending: false })

  const watched = (watchedRaw ?? []) as unknown as WatchedRow[]

  // ── Watchlist ─────────────────────────────────────────────────────────────────
  const { data: watchlistRaw } = await supabase
    .from('user_titles')
    .select('title_id, titles ( id, title, type, poster_url, release_year, genres )')
    .eq('user_id', user.id)
    .eq('status', 'watchlist')
    .order('added_at', { ascending: false })

  const watchlist = (watchlistRaw ?? []) as unknown as WatchlistRow[]

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalMovies  = watched.filter((r) => r.titles?.type === 'movie').length
  const totalSeries  = watched.filter((r) => r.titles?.type === 'series').length

  const ratedRows    = watched.filter((r) => r.rating !== null)
  const avgRating    = ratedRows.length > 0
    ? (ratedRows.reduce((acc, r) => acc + (r.rating ?? 0), 0) / ratedRows.length).toFixed(1)
    : '—'

  // Género más visto
  const genreCount: Record<string, number> = {}
  watched.forEach((r) => {
    (r.titles?.genres ?? []).forEach((g) => {
      genreCount[g] = (genreCount[g] ?? 0) + 1
    })
  })
  const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Plataforma más usada
  let topPlatform = '—'
  if (watched.length > 0) {
    const { data: avail } = await supabase
      .from('title_availability')
      .select('platform')
      .in('title_id', watched.map((r) => r.title_id))
      .eq('country', 'MX')

    const platCount: Record<string, number> = {}
    ;(avail ?? []).forEach((a: { platform: string }) => {
      platCount[a.platform] = (platCount[a.platform] ?? 0) + 1
    })
    const top = Object.entries(platCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (top) topPlatform = PLATFORM_LABELS[top] ?? top
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main
      className={nunito.className}
      style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #1A1A1A' }}
      >
        <Link
          href="/dashboard"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#666' }}
        >
          ← Volver
        </Link>
        <span className="text-lg font-extrabold text-white">📋 Historial</span>
        <div style={{ width: '60px' }} />
      </header>

      <div className="mx-auto max-w-lg px-6 py-6">
        <TabNav active={tab} />

        {/* Tab: Visto */}
        {tab === 'watched' && (
          <>
            {watched.length === 0 ? (
              <div className="py-16 text-center">
                <p className="mb-2 text-3xl">🎬</p>
                <p className="font-bold text-white">Nada por aquí todavía</p>
                <p className="mt-1 text-sm" style={{ color: '#666' }}>
                  Usa Snap para descubrir y guardar lo que ves
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {watched.map((row) => (
                  <WatchedCard key={row.title_id} row={row} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Watchlist */}
        {tab === 'watchlist' && (
          <>
            {watchlist.length === 0 ? (
              <div className="py-16 text-center">
                <p className="mb-2 text-3xl">📋</p>
                <p className="font-bold text-white">Tu lista está vacía</p>
                <p className="mt-1 text-sm" style={{ color: '#666' }}>
                  Guarda títulos desde Snap para verlos después
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {watchlist.map((row) => (
                  <WatchlistCard key={row.title_id} row={row} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Stats */}
        {tab === 'stats' && (
          <>
            {watched.length === 0 ? (
              <div className="py-16 text-center">
                <p className="mb-2 text-3xl">📊</p>
                <p className="font-bold text-white">Sin datos todavía</p>
                <p className="mt-1 text-sm" style={{ color: '#666' }}>
                  Marca títulos como vistos para ver tus estadísticas
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard value={String(totalMovies)} label="Películas vistas" />
                  <StatCard value={String(totalSeries)} label="Series vistas" />
                  <StatCard value={avgRating === '—' ? '—' : `${avgRating}★`} label="Rating promedio" />
                  <StatCard value={topPlatform} label="Plataforma top" />
                </div>
                <div
                  className="flex flex-col items-center justify-center gap-1 rounded-xl py-5"
                  style={{ background: '#111', border: '1px solid #FF3B5C33' }}
                >
                  <span className="text-2xl font-extrabold" style={{ color: '#FF3B5C' }}>
                    {topGenre}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#666' }}>Género favorito</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
