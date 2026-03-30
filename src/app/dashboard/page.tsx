import { Nunito } from 'next/font/google'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

const nunito = Nunito({ subsets: ['latin'] })

const PLATFORM_LABELS: Record<string, string> = {
  netflix: 'Netflix',
  disney:  'Disney+',
  hbo:     'HBO Max',
  prime:   'Prime Video',
  apple:   'Apple TV+',
}

const PLATFORM_COLORS: Record<string, string> = {
  netflix: '#E50914',
  disney:  '#113CCF',
  hbo:     '#5822B4',
  prime:   '#00A8E0',
  apple:   '#555',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('platforms, genres')
    .eq('user_id', user.id)
    .single()

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Usuario'

  const platforms: string[] = prefs?.platforms ?? []
  const genres: string[]    = prefs?.genres    ?? []

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
        <span className="text-xl font-extrabold tracking-tight">
          Flick<span style={{ color: '#FF3B5C' }}>Pick</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#ccc' }}>
            {displayName}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: '#666' }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-lg px-6 py-10">

        {/* Saludo */}
        <h1 className="mb-8 text-3xl font-extrabold">
          Hola, {displayName} 👋
        </h1>

        {/* Plataformas */}
        {platforms.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#666' }}>
              Tus plataformas
            </h2>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 text-xs font-bold"
                  style={{
                    background:   `${PLATFORM_COLORS[p] ?? '#333'}22`,
                    border:       `1px solid ${PLATFORM_COLORS[p] ?? '#333'}`,
                    borderRadius: '6px',
                    color:        PLATFORM_COLORS[p] ?? '#ccc',
                  }}
                >
                  {PLATFORM_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Géneros */}
        {genres.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#666' }}>
              Tus géneros
            </h2>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background:   '#1A1A1A',
                    border:       '1px solid #FF3B5C44',
                    borderRadius: '999px',
                    color:        '#FF3B5C',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Botones principales */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/snap"
            className="flex flex-col items-center justify-center gap-2 py-8 text-white transition-opacity hover:opacity-90 active:opacity-75"
            style={{ background: '#FF8C00', borderRadius: '14px' }}
          >
            <span className="text-3xl">⚡</span>
            <span className="text-base font-extrabold tracking-wide">Snap</span>
            <span className="text-xs font-medium opacity-75">Decide rápido</span>
          </Link>

          <button
            className="flex flex-col items-center justify-center gap-2 py-8 text-white transition-opacity hover:opacity-90 active:opacity-75"
            style={{ background: '#3B82F6', borderRadius: '14px' }}
          >
            <span className="text-3xl">🗳️</span>
            <span className="text-base font-extrabold tracking-wide">Pick</span>
            <span className="text-xs font-medium opacity-75">Vota con amigos</span>
          </button>
        </div>

      </div>
    </main>
  )
}
