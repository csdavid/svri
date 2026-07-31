# Stage 1: Build de la aplicación React con Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copiar código fuente y construir bundle optimizado para producción
COPY . .
RUN npm run build

# Stage 2: Servidor Nginx ligero para produccion
FROM nginx:alpine

# Configurar Nginx para escuchar en puerto 5175 con soporte de rutas SPA (index.html fallback)
RUN echo 'server { \
    listen 5175; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos generados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5175

CMD ["nginx", "-g", "daemon off;"]
