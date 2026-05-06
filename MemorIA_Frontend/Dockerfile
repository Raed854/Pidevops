# Stage 1 — build the Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Stage 2 — serve with nginx
FROM nginx:1.27-alpine
# Angular 18 with the application builder outputs to dist/<name>/browser
COPY --from=build /app/dist/memor-ia-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
