FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# maxsockets réduit + retries : évite un blocage réseau observé en environnement WSL2/Docker sur les téléchargements avec beaucoup de connexions concurrentes (même souci que backend/Dockerfile).
RUN npm config set fetch-timeout 600000 \
  && npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm ci --maxsockets=3

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
