'use client'

import { Nunito } from 'next/font/google'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSnapResult, type SnapInput, type SnapResult } from './actions'

const nunito = Nunito({ subsets: ['latin'] })

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Time    = SnapInput['time']
type Mood    = SnapInput['mood']
type Company = SnapInput['company']

interface Answers {
  time:    Time    | null
  mood:    Mood    | null
  company: Company | null
}

// ─── Datos de preguntas ───────────────────────────────────────────────────────

const QUESTIONS = [
  {
    key:      'time' as const,
    title:    '¿Cuánto tiempo tienes?',
    subtitle: 'Elige según tu disponibilidad',
    options:  [
      { value: 'short'  as Time, label: 'Menos de 1 hora',  icon: '⏱️' },
      { value: 'medium' as Time, label: '1 a 2 horas',      icon: '🕑' },
      { value: 'long'   as Time, label: 'Toda la noche',    icon: '🌙' },
    ],
  },
  {
    key:      'mood' as const,
    title:    '¿Cómo te sientes ahora?',
    subtitle: 'Cuéntanos tu estado de ánimo',
    options:  [
      { value: 'relaxed'     as Mood, label: 'Relajado',   icon: '😌' },
      { value: 'energized'   as Mood, label: 'Con energía', icon: '⚡' },
      { value: 'sentimental' as Mood, label: 'Sentimental', icon: '🥺' },
      { value: 'intrigued'   as Mood, label: 'Intrigado',   icon: '🔍' },
    ],
  },
  {
    key:      'company' as const,
    title:    '¿Con quién ves?',
    subtitle: 'Para afinar la recomendación',
    options:  [
      { value: 'solo'   as Company, label: 'Solo',     icon: '🎧' },
      { value: 'couple' as Company, label: 'En pareja', icon: '💑' },
      { value: 'group'  as Company, label: 'En grupo',  icon: '👥' },
    ],
  },
]

const PLATFORM_LABELS: Record<string, string> = {
  netflix: 'Netflix',
  disney:  'Disney+',
  hbo:     'HBO Max',
  prime:   'Prime Video',
  apple:   'Apple TV+',
}

// ─── Componente: Tarjeta de opción ────────────────────────────────────────────

function OptionCard({
  icon, label, selected, onClick,
}: {
  icon: string; label: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 py-6 text-center transition-all duration-150"
      style={{
        background:   selected ? '#FF3B5C' : '#1A1A1A',
        border:       `2px solid ${selected ? '#FF3B5C' : '#333'}`,
        borderRadius: '14px',
        boxShadow:    selected ? '0 0 20px #FF3B5C44' : 'none',
        color:        selected ? '#fff' : '#aaa',
      }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-bold leading-tight">{label}</span>
    </button>
  )
}

// ─── Componente: Paso de pregunta ─────────────────────────────────────────────

function QuestionStep({
  question,
  value,
  onSelect,
  step,
}: {
  question: typeof QUESTIONS[number]
  value: string | null
  onSelect: (v: string) => void
  step: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const cols = question.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div
      className="transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
    >
      {/* Indicador */}
      <div className="mb-8 flex gap-2">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: i < step ? '#FF3B5C' : i === step - 1 ? '#FF3B5C' : '#2A2A2A' }}
          />
        ))}
      </div>

      <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#666' }}>
        Pregunta {step} de 3
      </p>
      <h2 className="mb-1 text-2xl font-extrabold text-white">{question.title}</h2>
      <p className="mb-7 text-sm" style={{ color: '#888' }}>{question.subtitle}</p>

      <div className={`grid ${cols} gap-3`}>
        {question.options.map((opt) => (
          <OptionCard
            key={opt.value}
            icon={opt.icon}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => onSelect(opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Componente: Pantalla de loading ─────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div
        className="h-12 w-12 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#FF3B5C', borderTopColor: 'transparent' }}
      />
      <p className="text-lg font-bold text-white">Buscando tu película perfecta...</p>
      <p className="text-sm" style={{ color: '#666' }}>Analizando tu estado de ánimo</p>
    </div>
  )
}

// ─── Componente: Resultado ────────────────────────────────────────────────────

function ResultScreen({
  result,
  onAccept,
  onRetry,
  attempt,
  isPending,
}: {
  result: SnapResult
  onAccept: () => void
  onRetry: () => void
  attempt: number
  isPending: boolean
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 30) }, [])

  const ratingDisplay = result.rating > 10
    ? `${(result.rating / 10).toFixed(1)}`   // viene como 0-100
    : result.rating.toFixed(1)                // viene como 0-10

  return (
    <div
      className="transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
    >
      <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest" style={{ color: '#FF3B5C' }}>
        {attempt > 1 ? `Intento ${attempt}` : '¡Tu recomendación!'}
      </p>

      {/* Poster */}
      {result.poster_url ? (
        <img
          src={result.poster_url}
          alt={result.title}
          className="mx-auto mb-6 rounded-2xl object-cover shadow-2xl"
          style={{ width: '180px', height: '270px' }}
        />
      ) : (
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-2xl text-4xl"
          style={{ width: '180px', height: '270px', background: '#1A1A1A' }}
        >
          🎬
        </div>
      )}

      {/* Info */}
      <div className="text-center">
        <h2 className="mb-1 text-2xl font-extrabold text-white">{result.title}</h2>
        <p className="mb-3 text-sm" style={{ color: '#888' }}>
          {result.release_year ?? '—'} · {result.type === 'movie' ? 'Película' : 'Serie'} · ⭐ {ratingDisplay}
        </p>

        {/* Plataforma */}
        <span
          className="mb-4 inline-block px-3 py-1 text-xs font-bold"
          style={{ background: '#FF3B5C22', border: '1px solid #FF3B5C55', borderRadius: '6px', color: '#FF3B5C' }}
        >
          {PLATFORM_LABELS[result.platform] ?? result.platform}
        </span>

        {/* Géneros */}
        {result.genres.length > 0 && (
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {result.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="px-3 py-1 text-xs font-semibold"
                style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '999px', color: '#aaa' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Sinopsis */}
        {result.synopsis && (
          <p className="mb-7 text-sm leading-relaxed" style={{ color: '#888' }}>
            {result.synopsis.length > 160 ? result.synopsis.slice(0, 157) + '...' : result.synopsis}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onAccept}
          className="w-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: '#FF3B5C', borderRadius: '10px' }}
        >
          ✓ ¡La vemos!
        </button>
        <button
          onClick={onRetry}
          disabled={isPending}
          className="w-full py-3.5 text-sm font-bold transition-opacity hover:opacity-80"
          style={{
            background:   '#1A1A1A',
            border:       '2px solid #333',
            borderRadius: '10px',
            color:        isPending ? '#555' : '#ccc',
          }}
        >
          {isPending ? 'Buscando...' : 'Dame otro 🔄'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SnapPage() {
  const router = useRouter()
  const [step,    setStep]    = useState(0)   // 0,1,2 = preguntas; 3 = result
  const [answers, setAnswers] = useState<Answers>({ time: null, mood: null, company: null })
  const [result,  setResult]  = useState<SnapResult | null>(null)
  const [attempt, setAttempt] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Preferencias del usuario: las leemos via Server Action del session
  // Para simplificar el Client Component, se pasan como data-attributes del layout
  // o se obtienen al montar. Aquí las obtenemos de la Server Action directamente.
  const [userPlatforms, setUserPlatforms] = useState<string[]>([])
  const [userGenres,    setUserGenres]    = useState<string[]>([])

  useEffect(() => {
    // Cargar preferencias del usuario al montar
    fetch('/api/user-prefs')
      .then((r) => r.json())
      .then((d) => {
        if (d.platforms) setUserPlatforms(d.platforms)
        if (d.genres)    setUserGenres(d.genres)
      })
      .catch(() => {})
  }, [])

  function handleSelect(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value }
    setAnswers(next)

    // Auto-avanzar al siguiente paso tras seleccionar
    setTimeout(() => {
      if (step < 2) {
        setStep(step + 1)
      } else {
        // Última pregunta respondida → buscar resultado
        fetchResult(next as Required<Answers>, 1)
      }
    }, 200)
  }

  function fetchResult(ans: Answers, att: number) {
    const { time, mood, company } = ans
    if (!time || !mood || !company) return
    setAttempt(att)
    setStep(3)
    startTransition(async () => {
      const res = await getSnapResult({
        time,
        mood,
        company,
        attempt:       att,
        userPlatforms,
        userGenres,
      })
      setResult(res)
    })
  }

  function handleRetry() {
    if (!answers.time || !answers.mood || !answers.company) return
    fetchResult(answers as Required<Answers>, attempt + 1)
  }

  const currentQuestion = step < 3 ? QUESTIONS[step] : null
  const showLoading     = step === 3 && (isPending || !result)
  const showResult      = step === 3 && !isPending && result

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
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#666' }}
        >
          ← Volver
        </button>
        <span className="text-lg font-extrabold">
          ⚡ <span style={{ color: '#FF8C00' }}>Snap</span>
        </span>
        <div style={{ width: '60px' }} />
      </header>

      <div className="mx-auto max-w-sm px-6 py-8">
        {currentQuestion && (
          <QuestionStep
            key={step}
            question={currentQuestion}
            value={answers[currentQuestion.key]}
            onSelect={(v) => handleSelect(currentQuestion.key, v)}
            step={step + 1}
          />
        )}
        {showLoading && <LoadingScreen />}
        {showResult && result && (
          <ResultScreen
            result={result}
            attempt={attempt}
            isPending={isPending}
            onAccept={() => router.push('/dashboard')}
            onRetry={handleRetry}
          />
        )}
        {step === 3 && !isPending && !result && (
          <div className="py-20 text-center">
            <p className="mb-2 text-lg font-bold text-white">Sin resultados</p>
            <p className="mb-6 text-sm" style={{ color: '#666' }}>
              No encontramos nada con estos filtros.
            </p>
            <button
              onClick={() => { setStep(0); setAnswers({ time: null, mood: null, company: null }); setAttempt(1) }}
              className="px-6 py-3 text-sm font-bold text-white"
              style={{ background: '#FF3B5C', borderRadius: '10px' }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
