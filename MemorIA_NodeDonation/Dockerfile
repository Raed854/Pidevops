# Stage 1 — install deps (sqlite3 native module needs build tools)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ \
 && npm ci --omit=dev \
 && apk del python3 make g++

# Stage 2 — runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./
EXPOSE 8085
CMD ["node","server.js"]
