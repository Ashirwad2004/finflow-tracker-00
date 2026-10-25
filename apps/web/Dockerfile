FROM node:22-alpine AS build
WORKDIR /app

# The root lockfile installs both JavaScript workspaces reproducibly.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json
RUN npm ci

COPY apps/web ./apps/web
COPY packages/api-types ./packages/api-types
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=apps/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json
RUN npm ci --omit=dev --workspace=apps/web && npm cache clean --force
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY apps/web/server.js apps/web/load-env.js ./apps/web/
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
