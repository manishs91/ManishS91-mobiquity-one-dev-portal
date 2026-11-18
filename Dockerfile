# syntax=docker/dockerfile:1.7
# Two images from one file:
#   docker build --target portal -t m1-dev-portal .
#   docker build --target mock   -t m1-mock-sandbox .

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm test && npm run build

# ---- Portal (Next.js standalone server) ----
FROM node:22-alpine AS portal
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/.data && chown app:app /app/.data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/openapi ./openapi
COPY --from=build --chown=app:app /app/content ./content
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]

# ---- Mock sandbox ----
FROM deps AS mock
WORKDIR /app
COPY openapi ./openapi
COPY mock-server ./mock-server
COPY src/lib ./src/lib
COPY src/config ./src/config
ENV PORT=4010
EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4010/__health || exit 1
CMD ["npx", "tsx", "mock-server/server.ts"]
