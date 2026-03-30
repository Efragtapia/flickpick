import { Nunito } from 'next/font/google'
import Link from 'next/link'
import { register } from '@/app/auth/actions'

const nunito = Nunito({ subsets: ['latin'] })

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <main
      className={nunito.className}
      style={{ background: '#0F0F0F', minHeight: '100vh' }}
    >
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Flick<span style={{ color: '#FF3B5C' }}>Pick</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#888' }}>
              Crea tu cuenta para empezar
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 px-4 py-3 text-sm text-white"
              style={{ background: '#FF3B5C22', border: '1px solid #FF3B5C55', borderRadius: '10px' }}
            >
              {decodeURIComponent(error)}
            </div>
          )}

          {/* Form */}
          <form action={register} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display_name" className="text-sm font-semibold text-white">
                Nombre
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                required
                autoComplete="name"
                placeholder="¿Cómo te llamamos?"
                className="auth-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-white">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="auth-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-white">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="auth-input"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: '#FF3B5C', borderRadius: '10px' }}
            >
              Crear cuenta
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm" style={{ color: '#888' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/auth/login"
              className="font-semibold hover:underline"
              style={{ color: '#FF3B5C' }}
            >
              Inicia sesión
            </Link>
          </p>

        </div>
      </div>
    </main>
  )
}
