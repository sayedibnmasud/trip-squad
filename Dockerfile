# Blocks Release builds from the repository root; the app lives in web/.
# Mirrors web/Dockerfile with paths adjusted for the root build context.
FROM node:22-alpine AS builder

WORKDIR /app

COPY web/package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY web/ .

ARG ci_build=dev
ARG VITE_BLOCKS_API_URL
ARG VITE_BLOCKS_PROJECT_KEY
ARG VITE_BLOCKS_X_BLOCKS_KEY
ARG VITE_BLOCKS_APP_DOMAIN
ARG VITE_BLOCKS_OIDC_URL
ARG VITE_BLOCKS_OIDC_CLIENT_ID
ARG VITE_BLOCKS_OIDC_SCOPE
ARG VITE_BLOCKS_REDIRECT_URI

# Build args override web/.env.<ci_build> only when Release supplies them;
# an empty ENV would otherwise blank the value Vite reads from that file.
RUN for name in VITE_BLOCKS_API_URL VITE_BLOCKS_PROJECT_KEY VITE_BLOCKS_X_BLOCKS_KEY VITE_BLOCKS_APP_DOMAIN \
      VITE_BLOCKS_OIDC_URL VITE_BLOCKS_OIDC_CLIENT_ID VITE_BLOCKS_OIDC_SCOPE VITE_BLOCKS_REDIRECT_URI; do \
      eval "value=\${$name}"; [ -n "$value" ] && echo "$name=$value" >> ".env.${ci_build}.local"; done; \
    NODE_OPTIONS="--max-old-space-size=4096" npx vite build --mode "${ci_build}" \
  && node scripts/write-release-env.mjs "${ci_build}"

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
