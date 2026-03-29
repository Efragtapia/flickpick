# FlickPick — CLAUDE.md

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Realtime)
- Vercel (deploy)

## Estructura de carpetas
- /src/app → rutas y páginas (App Router)
- /src/components → componentes reutilizables
- /src/lib → utilidades, clientes de API, helpers
- /src/lib/supabase → cliente de Supabase (server y client)
- /src/types → tipos TypeScript globales

## Convenciones de código
- Componentes: PascalCase (MovieCard.tsx)
- Hooks: camelCase con prefijo use (useSession.ts)
- Utilidades: camelCase (formatDate.ts)
- Siempre TypeScript estricto — nunca usar `any`
- Siempre manejar estados de loading y error
- Nunca hardcodear strings — usar constantes en /src/lib/constants.ts

## Supabase
- Usar cliente SERVER (service role) para operaciones de escritura en rutas de API
- Usar cliente CLIENT (anon key) solo para lecturas en componentes
- Nunca exponer service_role key en el cliente
- RLS habilitado en todas las tablas

## Variables de entorno requeridas
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TMDB_API_KEY=
RAPIDAPI_KEY=

## Flujo de trabajo
1. Siempre usar /plan antes de implementar features nuevas
2. Cada fase termina con un commit — nunca mezclar fases
3. Probar en localhost antes de hacer commit
4. Formato de commit: feat(fase): descripción breve

## Colores de marca (Tailwind custom)
- Primary: #FF3B5C (flick-red)
- Dark: #0F0F0F (cinema-black)
- Light: #F9F9F9 (screen-white)

## APIs externas
- TMDB: metadata de películas/series — https://api.themoviedb.org/3
- Streaming Availability: disponibilidad por plataforma MX — via RapidAPI
- Cachear en Supabase, nunca llamar directo desde el cliente