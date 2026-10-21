# Depo kökünden derlenir: docker build -f apps/web/Dockerfile .
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --include-workspace-root --ignore-scripts
COPY apps/web apps/web
ARG NEXT_PUBLIC_LIVE_URL=http://localhost:4000
ENV NEXT_PUBLIC_LIVE_URL=$NEXT_PUBLIC_LIVE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
