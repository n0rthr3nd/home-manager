# Dockerfile para el Backend BFF - Blinds Control
FROM node:22-alpine

WORKDIR /app

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar codigo fuente
COPY src/ ./src/

# No copiar .env - las variables se inyectan desde Kubernetes Secrets/ConfigMaps

# Puerto por defecto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Ejecutar como usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "src/server.js"]
