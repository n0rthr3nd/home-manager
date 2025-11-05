# Multi-stage build optimizado para Raspberry Pi 5 (ARM64)

# Etapa 1: Build de la aplicación Angular
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Build de producción
# La variable API_URL se puede pasar en build time
ARG API_URL
ENV API_URL=${API_URL}

RUN npm run build

# Etapa 2: Servidor Nginx para servir la app
FROM nginx:alpine

# Copiar archivos compilados desde la etapa de build
COPY --from=builder /app/dist/blinds-control-app/browser /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY k8s/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/index.html || exit 1

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
