# FlickPick — CLAUDE.md

## Stack
- Next.js 16.2.1 (App Router, TypeScript, Turbopack)
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Realtime)
- Vercel (deploy)
- Node.js 20 (requerido — usar `nvm use 20`)

## Estado del proyecto
- Fase 1 ✅ Setup inicial y estructura base
- Fase 2 ✅ Auth completo (login, register, callback, onboarding)
- Fase 3 ✅ Dashboard + preferencias de usuario
- Fase 4 ✅ Modo Snap (decisión automática)
- Fase 5 ✅ Modo Pick (sesión compartida con [sessionId])
- Fase 6 ✅ History (watchlist + historial visto + stats)

## Rutas principales
- / → landing
- /auth/login → login
- /auth/register → registro
- /onboarding → configuración inicial de preferencias
- /dashboard → home del usuario autenticado
- /snap → modo decisión automática
- /pick → modo sesión grupal
- /pick/[sessionId] → sala de votación en tiempo real
- /history → historial, watchlist y stats

## Estructura de carpetas
- /src/app → rutas y páginas (App Router)
- /src/components → componentes reutilizables
- /src/lib → utilidades, clientes de API, helpers
- /src/lib/supabase → cliente de Supabase (server y client)
- /src/types → tipos TypeScript globales

## Tablas en Supabase
- profiles → datos del usuario
- titles → catálogo de películas/series (~2000 títulos seed)
- user_titles → historial del usuario (status: watched | watchlist)
- sessions → sesiones de Pick
- session_participants → participantes por sesión
- session_votes → votos por sesión
- title_availability → disponibilidad por plataforma
- user_preferences → preferencias de géneros y plataformas

## Columnas importantes (evitar errores)
- user_titles.added_at → fecha de agregado (NO created_at)
- user_titles.status → 'watched' | 'watchlist'

## Convenciones de código
- Componentes: PascalCase (MovieCard.tsx)
- Hooks: camelCase con prefijo use (useSession.ts)
- Utilidades: camelCase (formatDate.ts)
- Siempre TypeScript estricto — nunca usar `any`
- Siempre manejar estados de loading y error
- Siempre desestructurar error de Supabase: const { data, error } = await supabase...

## Supabase
- Cliente SERVER: src/lib/supabase/server.ts — para Server Components y Actions
- Cliente CLIENT: src/lib/supabase/client.ts — solo para Client Components
- RLS habilitado en todas las tablas
- Nunca exponer service_role key al cliente

## Variables de entorno requeridas
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TMDB_API_KEY=
RAPIDAPI_KEY=

## Flujo de trabajo
1. Siempre usar /plan antes de implementar features nuevas
2. Cada fase termina con un commit descriptivo
3. Probar en localhost antes de hacer commit
4. Formato de commit: feat(faseN): descripción breve
5. Nunca mezclar cambios de fases distintas en un mismo commit

## Colores de marca
- Primary: #FF3B5C (flick-red)
- Dark: #0F0F0F (cinema-black)
- Light: #F9F9F9 (screen-white)

## APIs externas
- TMDB: metadata de películas/series — https://api.themoviedb.org/3
- Streaming Availability: disponibilidad por plataforma MX — via RapidAPI
- Cachear en Supabase, nunca llamar directo desde el cliente
