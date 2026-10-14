# syntax=docker/dockerfile:1

##############################
# Stage 1 — install deps
# bcrypt has a native addon, so this stage carries build tools.
##############################
FROM node:20-bookworm-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lockfiles only first so this layer is cached until deps actually change.
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production=true \
    && yarn cache clean

##############################
# Stage 2 — runtime image
# Slim, no build tools, non-root user.
##############################
FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Reuse the node:* image's built-in unprivileged "node" user instead of root.
RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# uploads/ is user-generated content — mount it as a volume so it
# survives redeploys instead of baking it into the image layer.
VOLUME ["/app/uploads"]

USER node

EXPOSE 4000
ENV PORT=4000

# Matches the existing DB-free health endpoint defined in server.js.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
