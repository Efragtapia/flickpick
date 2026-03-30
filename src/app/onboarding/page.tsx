'use client'

import { Nunito } from 'next/font/google'
import { useState, useTransition } from 'react'
import { savePreferences } from './actions'

const nunito = Nunito({ subsets: ['latin'] })

// ─── Datos ────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'netflix',  label: 'Netflix',      bg: '#E50914', text: '#fff' },
  { id: 'disney',   label: 'Disney+',      bg: '#113CCF', text: '#fff' },
  { id: 'hbo',      label: 'HBO Max',      bg: '#5822B4', text: '#fff' },
  { id: 'prime',    label: 'Prime Video',  bg: '#00A8E0', text: '#fff' },
  { id: 'apple',    label: 'Apple TV+',    bg: '#1C1C1E', text: '#fff' },
]

const GENRES = [
  'Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia ficción',
  'Romance', 'Documental', 'Animación', 'Thriller', 'Fantasía',
  'Crimen', 'Aventura',
]

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-10">
      <p className="mb-3 text-center text-xs font-semibold tracking-widest uppercase" style={{ color: '#666' }}>
        Paso {step} de 2
      </p>
      <div className="flex gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: n <= step ? '#FF3B5C' : '#2A2A2A' }}
          />
        ))}
      </div>
    </div>
  )
}

function ContinueButton({
  disabled,
  onClick,
  pending,
  label,
}: {
  disabled: boolean
  onClick: () => void
  pending: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      className="mt-8 w-full py-3 text-sm font-bold text-white transition-opacity"
      style={{
        background: disabled || pending ? '#555' : '#FF3B5C',
        borderRadius: '10px',
        cursor: disabled || pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? 'Guardando...' : label}
    </button>
  )
}

// ─── Paso 1: Plataformas ──────────────────────────────────────────────────────

function StepPlatforms({
  selected,
  onToggle,
  onNext,
}: {
  selected: Set<string>
  onToggle: (id: string) => void
  onNext: () => void
}) {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold text-white">¿Qué plataformas tienes?</h1>
        <p className="mt-2 text-sm" style={{ color: '#888' }}>Selecciona todas las que usas</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const isSelected = selected.has(p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="relative flex items-center justify-center rounded-xl py-5 text-sm font-bold transition-all duration-150"
              style={{
                background:  isSelected ? p.bg : '#1A1A1A',
                border:      isSelected ? `2px solid ${p.bg}` : '2px solid #333',
                color:       isSelected ? p.text : '#aaa',
                boxShadow:   isSelected ? `0 0 16px ${p.bg}55` : 'none',
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full text-xs"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  ✓
                </span>
              )}
              {p.label}
            </button>
          )
        })}
      </div>

      <ContinueButton
        disabled={selected.size === 0}
        onClick={onNext}
        pending={false}
        label="Continuar"
      />

      {selected.size === 0 && (
        <p className="mt-3 text-center text-xs" style={{ color: '#666' }}>
          Selecciona al menos 1 plataforma
        </p>
      )}
    </>
  )
}

// ─── Paso 2: Géneros ──────────────────────────────────────────────────────────

function StepGenres({
  selected,
  onToggle,
  onFinish,
  pending,
}: {
  selected: Set<string>
  onToggle: (g: string) => void
  onFinish: () => void
  pending: boolean
}) {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold text-white">¿Qué te gusta ver?</h1>
        <p className="mt-2 text-sm" style={{ color: '#888' }}>Elige tus géneros favoritos</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {GENRES.map((g) => {
          const isSelected = selected.has(g)
          return (
            <button
              key={g}
              onClick={() => onToggle(g)}
              className="px-4 py-2 text-sm font-semibold transition-all duration-150"
              style={{
                background:  isSelected ? '#FF3B5C' : '#1A1A1A',
                border:      isSelected ? '2px solid #FF3B5C' : '2px solid #333',
                borderRadius: '999px',
                color:       isSelected ? '#fff' : '#aaa',
              }}
            >
              {g}
            </button>
          )
        })}
      </div>

      <ContinueButton
        disabled={selected.size < 3}
        onClick={onFinish}
        pending={pending}
        label="Empezar a descubrir"
      />

      {selected.size < 3 && (
        <p className="mt-3 text-center text-xs" style={{ color: '#666' }}>
          Selecciona al menos 3 géneros ({selected.size}/3)
        </p>
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep]               = useState<1 | 2>(1)
  const [platforms, setPlatforms]     = useState<Set<string>>(new Set())
  const [genres, setGenres]           = useState<Set<string>>(new Set())
  const [isPending, startTransition]  = useTransition()

  function togglePlatform(id: string) {
    setPlatforms((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGenre(g: string) {
    setGenres((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  function handleFinish() {
    startTransition(async () => {
      await savePreferences([...platforms], [...genres])
    })
  }

  return (
    <main
      className={nunito.className}
      style={{ background: '#0F0F0F', minHeight: '100vh' }}
    >
      <div className="flex min-h-screen items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-md">

          {/* Logo */}
          <p className="mb-8 text-center text-xl font-extrabold tracking-tight text-white">
            Flick<span style={{ color: '#FF3B5C' }}>Pick</span>
          </p>

          <ProgressBar step={step} />

          {step === 1 ? (
            <StepPlatforms
              selected={platforms}
              onToggle={togglePlatform}
              onNext={() => setStep(2)}
            />
          ) : (
            <StepGenres
              selected={genres}
              onToggle={toggleGenre}
              onFinish={handleFinish}
              pending={isPending}
            />
          )}

        </div>
      </div>
    </main>
  )
}
