FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# maxsockets réduit + retries : évite un blocage réseau observé en environnement WSL2/Docker sur les téléchargements avec beaucoup de connexions concurrentes.
RUN npm config set fetch-timeout 600000 \
  && npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm ci --maxsockets=3

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start:prod"]
