# Stage 1 — build the Angular app
FROM node:20-alpine AS build
WORKDIR /app
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
