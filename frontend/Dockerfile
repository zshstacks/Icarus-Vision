# ---------- build ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Vite inlines import.meta.env.VITE_* at build time — browser-facing URLs
ARG VITE_PUBLIC_API_URL=http://localhost:8080
ARG VITE_PUBLIC_WS_API_URL=ws://localhost:8080/ws
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
ENV VITE_PUBLIC_WS_API_URL=$VITE_PUBLIC_WS_API_URL

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80