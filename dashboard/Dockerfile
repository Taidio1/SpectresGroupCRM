# Dockerfile dla aplikacji CRM Next.js
FROM node:18-alpine AS base

# Zainstaluj dependencies tylko gdy potrzebne
FROM base AS deps
# Sprawdź https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache git libc6-compat
WORKDIR /app

# Kopiuj pliki dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* ./
# Zainstaluj dependencies używając npm, yarn lub pnpm
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile


# Rebuild źródła tylko gdy się zmieniły
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
RUN npm install -g pnpm
COPY . .

# Zmienne środowiskowe potrzebne podczas build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Wyłącz telemetrię Next.js podczas buildu
ENV NEXT_TELEMETRY_DISABLED=1

# Build aplikacji
RUN pnpm run build

# Produkcyjny image, kopiuj tylko potrzebne pliki
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Stwórz group i user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Kopiuj pliki publiczne
COPY --from=builder /app/public ./public

# Automatycznie wykorzystuj output traces aby zredukować rozmiar image
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start serwera
CMD ["node", "server.js"] 