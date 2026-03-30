'use client'

import { Nunito } from 'next/font/google'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSession, joinSession } from './actions'

const nunito = Nunito({ subsets: ['latin'] })

export default function PickPage() {
  const router = useRouter()
  const [code, setCode]           = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createSession()
      if (result && 'error' in result) setError(result.error)
    })
  }

  function handleJoin() {
    if (code.length !== 4) return
    setError(null)
    startTransition(async () => {
      const result = await joinSession(code)
      if (result && 'error' in result) setError(result.error)
    })
  }

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
          🗳️ <span style={{ color: '#3B82F6' }}>Pick</span>
        </span>
        <div style={{ width: '60px' }} />
      </header>

      <div className="mx-auto max-w-sm px-6 py-10">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-extrabold text-white">Modo Pick</h1>
          <p className="mt-2 text-sm" style={{ color: '#888' }}>
            Vota con amigos y encuentra la película perfecta
          </p>
        </div>

        {/* Crear sala */}
        <div
          className="mb-5 rounded-2xl p-6"
          style={{ background: '#111', border: '1px solid #1E1E1E' }}
        >
          <h2 className="mb-1 text-base font-extrabold text-white">Crear sala nueva</h2>
          <p className="mb-5 text-xs" style={{ color: '#666' }}>
            Genera un código y compártelo con tus amigos
          </p>
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="w-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{
              background:   isPending ? '#1e3a6e' : '#3B82F6',
              borderRadius: '10px',
              opacity:      isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Creando sala...' : '+ Crear sala nueva'}
          </button>
        </div>

        {/* Divider */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: '#222' }} />
          <span className="text-xs font-semibold" style={{ color: '#444' }}>o</span>
          <div className="h-px flex-1" style={{ background: '#222' }} />
        </div>

        {/* Unirse */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#111', border: '1px solid #1E1E1E' }}
        >
          <h2 className="mb-1 text-base font-extrabold text-white">Unirse a sala</h2>
          <p className="mb-4 text-xs" style={{ color: '#666' }}>
            Ingresa el código de 4 letras que te compartieron
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
            placeholder="ABCD"
            maxLength={4}
            className="auth-input mb-3 text-center text-2xl font-extrabold tracking-widest"
            style={{ letterSpacing: '0.5em' }}
          />

          <button
            onClick={handleJoin}
            disabled={code.length !== 4 || isPending}
            className="w-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{
              background:   code.length !== 4 || isPending ? '#555' : '#3B82F6',
              borderRadius: '10px',
              cursor:       code.length !== 4 || isPending ? 'not-allowed' : 'pointer',
              opacity:      isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Uniéndose...' : 'Unirse a sala'}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm font-semibold" style={{ color: '#FF3B5C' }}>
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
