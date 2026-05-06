# Stage 1 — build the Angular app
# Using Debian (glibc) instead of Alpine (musl): Angular 18's @angular/build
# pulls in `lmdb` as a native dep whose musl prebuilt is broken; falling back
# to local compile would need python3 + g++. glibc has working prebuilts.
FROM node:20-bullseye-slim AS build
WORKDIR /app
# Give Node up to 4 GB heap so Angular 18's bundler doesn't OOM on a small VM
ENV NODE_OPTIONS=--max_old_space_size=4096
COPY package*.json ./
RUN npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-maxtimeout=600000 --fetch-timeout=900000
COPY . .
RUN npm run build

# Stage 2 — serve with nginx
FROM nginx:1.27-alpine
# Angular 18 with the application builder outputs to dist/<name>/browser
COPY --from=build /app/dist/memor-ia-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
