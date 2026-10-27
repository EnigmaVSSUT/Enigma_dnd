# ---------- Builder stage ----------
FROM node:24-alpine AS builder

WORKDIR /app

# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

# Install deps first (better layer caching)
# prisma/ must be present before `npm ci` because postinstall runs `prisma generate`
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Build TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build
# Drop devDependencies for a smaller runtime image
RUN npm prune --omit=dev


# ---------- Runner stage ----------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache openssl

# Prisma CLI is a devDependency (pruned above), but we need it at
# container start for `prisma migrate deploy`. Reuse the exact prod
# node_modules (with the generated client) built above, then add only the CLI.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh
# prisma/ is already in place, so the postinstall `prisma generate` succeeds
RUN npm install --no-save --no-audit --no-fund prisma@6.9.0

EXPOSE 3000

# (or uses DATABASE_URL if set), applies migrations, then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
