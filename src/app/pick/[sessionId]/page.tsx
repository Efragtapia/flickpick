'use client'

import { Nunito } from 'next/font/google'
import { useState, useEffect, useTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { submitVote, type PickTitle } from '../actions'

const nunito = Nunito({ subsets: ['latin'] })

const PLATFORM_LABELS: Record<string, string> = {
  netflix: 'Netflix',
  disney:  'Disney+',
  hbo:     'HBO Max',
  prime:   'Prime Video',
  apple:   'Apple TV+',
}

interface Session {
  id:        string
  code:      string
  status:    'waiting' | 'active' | 'finished'
  title_ids: string[]
}

// ─── Match overlay ────────────────────────────────────────────────────────────

function MatchOverlay({
  title,
  onAccept,
  onContinue,
}: {
  title: PickTitle
  onAccept: () => void
  onContinue: () => void
}) {
  const ratingDisplay = title.rating > 10
    ? (title.rating / 10).toFixed(1)
    : title.rating.toFixed(1)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(15,15,15,0.97)' }}
    >
      <p
        className="mb-2 text-4xl font-extrabold tracking-tight"
        style={{ color: '#FF3B5C' }}
      >
        ¡MATCH! 🎬
      </p>
      <p className="mb-8 text-sm font-semibold" style={{ color: '#666' }}>
        A los dos les gustó
      </p>

      {title.poster_url ? (
        <img
          src={title.poster_url}
          alt={title.title}
          className="mb-6 rounded-2xl object-cover shadow-2xl"
          style={{ width: '160px', height: '240px' }}
        />
      ) : (
        <div
          className="mb-6 flex items-center justify-center rounded-2xl text-4xl"
          style={{ width: '160px', height: '240px', background: '#1A1A1A' }}
        >
          🎬
        </div>
      )}

      <h2 className="mb-1 text-2xl font-extrabold text-white text-center">{title.title}</h2>
      <p className="mb-6 text-sm text-center" style={{ color: '#888' }}>
        {title.release_year ?? '—'} · {title.type === 'movie' ? 'Película' : 'Serie'} · ⭐ {ratingDisplay}
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={onAccept}
          className="w-full py-3.5 text-sm font-bold text-white"
          style={{ background: '#FF3B5C', borderRadius: '10px' }}
        >
          ✓ ¡La vemos!
        </button>
        <button
          onClick={onContinue}
          className="w-full py-3.5 text-sm font-bold"
          style={{ background: '#1A1A1A', border: '2px solid #333', borderRadius: '10px', color: '#ccc' }}
        >
          Seguir explorando
        </button>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TitleCard({
  title,
  swipeDir,
}: {
  title: PickTitle
  swipeDir: 'left' | 'right' | null
}) {
  const ratingDisplay = title.rating > 10
    ? (title.rating / 10).toFixed(1)
    : title.rating.toFixed(1)

  const transform = swipeDir === 'right'
    ? 'translateX(120%) rotate(15deg)'
    : swipeDir === 'left'
    ? 'translateX(-120%) rotate(-15deg)'
    : 'translateX(0) rotate(0deg)'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:  '#111',
        border:      '1px solid #1E1E1E',
        transform,
        opacity:     swipeDir ? 0 : 1,
        transition:  'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      {/* Poster */}
      <div className="flex justify-center pt-6">
        {title.poster_url ? (
          <img
            src={title.poster_url}
            alt={title.title}
            className="rounded-xl object-cover shadow-xl"
            style={{ width: '160px', height: '240px' }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-xl text-5xl"
            style={{ width: '160px', height: '240px', background: '#1A1A1A' }}
          >
            🎬
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h2 className="mb-1 text-xl font-extrabold text-white text-center leading-tight">
          {title.title}
        </h2>
        <p className="mb-3 text-xs text-center" style={{ color: '#888' }}>
          {title.release_year ?? '—'} · {title.type === 'movie' ? 'Película' : 'Serie'} · ⭐ {ratingDisplay}
        </p>

        {/* Plataforma */}
        <div className="mb-3 flex justify-center">
          <span
            className="px-3 py-1 text-xs font-bold"
            style={{
              background:   '#3B82F622',
              border:       '1px solid #3B82F655',
              borderRadius: '6px',
              color:        '#3B82F6',
            }}
          >
            {PLATFORM_LABELS[title.platform] ?? title.platform}
          </span>
        </div>

        {/* Géneros */}
        {title.genres.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-center gap-1.5">
            {title.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="px-2.5 py-1 text-xs font-semibold"
                style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '999px', color: '#aaa' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        {title.synopsis && (
          <p className="text-xs leading-relaxed text-center" style={{ color: '#666' }}>
            {title.synopsis.length > 120
              ? title.synopsis.slice(0, 117) + '...'
              : title.synopsis}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PickSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const router = useRouter()

  const [session,      setSession]      = useState<Session | null>(null)
  const [titles,       setTitles]       = useState<PickTitle[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likes,        setLikes]        = useState<Record<string, number>>({})
  const [matchedTitle, setMatchedTitle] = useState<PickTitle | null>(null)
  const [participants, setParticipants] = useState(0)
  const [swipeDir,     setSwipeDir]     = useState<'left' | 'right' | null>(null)
  const [myUserId,     setMyUserId]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [,             startTransition] = useTransition()
  const [copied,       setCopied]       = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // 1. Usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setMyUserId(user.id)

      // 2. Sesión
      const { data: sess } = await supabase
        .from('sessions')
        .select('id, code, status, title_ids')
        .eq('id', sessionId)
        .single()

      if (!sess) { router.push('/pick'); return }
      setSession(sess)

      // 3. Verificar participante
      const { data: part } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (!part) { router.push('/pick'); return }

      // 4. Títulos (respetar orden de title_ids)
      const { data: rawTitles } = await supabase
        .from('titles')
        .select('id, title, type, poster_url, rating, release_year, genres, synopsis')
        .in('id', sess.title_ids)

      const titleMap: Record<string, PickTitle> = {}
      ;(rawTitles ?? []).forEach((t: Record<string, unknown>) => {
        titleMap[t.id as string] = t as unknown as PickTitle
      })

      // Enrich with platform from sessions title_ids order (platform comes from availability)
      // Fetch platforms for these titles
      const { data: avail } = await supabase
        .from('title_availability')
        .select('title_id, platform')
        .in('title_id', sess.title_ids)
        .eq('country', 'MX')

      const platformMap: Record<string, string> = {}
      ;(avail ?? []).forEach((a: { title_id: string; platform: string }) => {
        if (!platformMap[a.title_id]) platformMap[a.title_id] = a.platform
      })

      const orderedTitles: PickTitle[] = sess.title_ids
        .map((id: string) => {
          if (!titleMap[id]) return null
          return { ...titleMap[id], platform: platformMap[id] ?? '' }
        })
        .filter(Boolean) as PickTitle[]

      setTitles(orderedTitles)

      // 5. Votos existentes
      const { data: existingVotes } = await supabase
        .from('session_votes')
        .select('title_id, user_id, vote')
        .eq('session_id', sessionId)

      const likesMap: Record<string, number> = {}
      let myVotedCount = 0
      ;(existingVotes ?? []).forEach((v: { title_id: string; user_id: string; vote: boolean }) => {
        if (v.vote === true) {
          likesMap[v.title_id] = (likesMap[v.title_id] ?? 0) + 1
        }
        if (v.user_id === user.id) myVotedCount++
      })
      setLikes(likesMap)
      setCurrentIndex(myVotedCount)

      // Check existing matches
      for (const [titleId, count] of Object.entries(likesMap)) {
        if (count >= 2) {
          const matched = orderedTitles.find((t) => t.id === titleId) ?? null
          if (matched) { setMatchedTitle(matched); break }
        }
      }

      // 6. Participantes
      const { count } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      setParticipants(count ?? 0)

      setLoading(false)

      // 7. Realtime
      channel = supabase.channel(`pick:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'session_votes',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const v = payload.new as { title_id: string; user_id: string; vote: boolean }
            if (v.vote === true && v.user_id !== user.id) {
              setLikes((prev) => {
                const count = (prev[v.title_id] ?? 0) + 1
                if (count >= 2) {
                  setTitles((ts) => {
                    const matched = ts.find((t) => t.id === v.title_id) ?? null
                    if (matched) setMatchedTitle(matched)
                    return ts
                  })
                }
                return { ...prev, [v.title_id]: count }
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'session_participants',
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            setParticipants((p) => p + 1)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) createClient().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  function handleVote(like: boolean) {
    const title = titles[currentIndex]
    if (!title) return

    setSwipeDir(like ? 'right' : 'left')

    setTimeout(() => {
      startTransition(async () => {
        await submitVote(sessionId, title.id, like)
        if (like) {
          setLikes((prev) => {
            const count = (prev[title.id] ?? 0) + 1
            if (count >= 2) setMatchedTitle(title)
            return { ...prev, [title.id]: count }
          })
        }
      })
      setSwipeDir(null)
      setCurrentIndex((i) => i + 1)
    }, 300)
  }

  function copyCode() {
    if (!session) return
    navigator.clipboard.writeText(session.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const currentTitle = titles[currentIndex] ?? null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main
      className={nunito.className}
      style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff', position: 'relative' }}
    >
      {/* Match overlay */}
      {matchedTitle && (
        <MatchOverlay
          title={matchedTitle}
          onAccept={() => router.push('/dashboard')}
          onContinue={() => setMatchedTitle(null)}
        />
      )}

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #1A1A1A' }}
      >
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#666' }}
        >
          ← Volver
        </button>
        <span className="text-lg font-extrabold">
          🗳️ <span style={{ color: '#3B82F6' }}>Pick</span>
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: '#1A1A1A', border: '1px solid #333', color: '#888' }}
        >
          {participants} en sala
        </span>
      </header>

      <div className="mx-auto max-w-sm px-6 py-6">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }}
            />
            <p className="text-sm font-bold text-white">Cargando sala...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Código de sala (mientras espera) */}
            {session?.status === 'waiting' && (
              <div className="mb-6 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#666' }}>
                  Comparte este código
                </p>
                <button
                  onClick={copyCode}
                  className="inline-block rounded-xl px-6 py-4 text-4xl font-extrabold tracking-widest transition-opacity hover:opacity-80"
                  style={{
                    background:    '#1A1A1A',
                    border:        '2px solid #3B82F6',
                    color:         '#3B82F6',
                    letterSpacing: '0.3em',
                  }}
                >
                  {session.code}
                </button>
                <p className="mt-2 text-xs" style={{ color: copied ? '#4ade80' : '#555' }}>
                  {copied ? '¡Copiado!' : 'Toca para copiar'}
                </p>
                {participants < 2 && (
                  <p className="mt-3 text-xs" style={{ color: '#555' }}>
                    Esperando que alguien más se una...
                  </p>
                )}
              </div>
            )}

            {/* Card actual */}
            {currentTitle ? (
              <>
                <div className="mb-1 text-center">
                  <p className="text-xs font-semibold" style={{ color: '#555' }}>
                    {currentIndex + 1} / {titles.length}
                  </p>
                </div>

                <div className="mb-6">
                  <TitleCard title={currentTitle} swipeDir={swipeDir} />
                </div>

                {/* Botones */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleVote(false)}
                    disabled={!!swipeDir}
                    className="flex flex-1 items-center justify-center rounded-2xl py-5 text-3xl transition-all hover:opacity-80 active:scale-95"
                    style={{
                      background:   '#1A1A1A',
                      border:       '2px solid #333',
                    }}
                  >
                    ❌
                  </button>
                  <button
                    onClick={() => handleVote(true)}
                    disabled={!!swipeDir}
                    className="flex flex-1 items-center justify-center rounded-2xl py-5 text-3xl transition-all hover:opacity-80 active:scale-95"
                    style={{
                      background: '#FF3B5C',
                      boxShadow:  '0 0 20px #FF3B5C44',
                    }}
                  >
                    ✓
                  </button>
                </div>
              </>
            ) : (
              /* Sin más títulos */
              !loading && (
                <div className="py-20 text-center">
                  <p className="mb-2 text-2xl">🎬</p>
                  <p className="mb-2 text-lg font-bold text-white">Has visto todo</p>
                  <p className="mb-6 text-sm" style={{ color: '#666' }}>
                    No quedan más títulos para votar.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 text-sm font-bold text-white"
                    style={{ background: '#3B82F6', borderRadius: '10px' }}
                  >
                    Volver al inicio
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>
    </main>
  )
}
