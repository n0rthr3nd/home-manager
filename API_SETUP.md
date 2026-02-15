# Configuracion de API - Guia Rapida

## Arquitectura

```
Frontend Angular  -->  Backend BFF (Node.js)  -->  Z-Way API
  (nginx)               (Express)                  (192.168.1.x:8083)
  puerto 80             puerto 3000
```

El frontend NO contacta directamente con Z-Way. Todas las llamadas pasan por
el backend BFF, que se encarga de:

1. Recibir la peticion del frontend.
2. Añadir el header `zwaysession` con el token (leido de variable de entorno).
3. Reenviar la peticion a Z-Way.
4. Devolver la respuesta al frontend sin modificarla.

El token **nunca** viaja al navegador ni se incluye en el repositorio.

---

## Desarrollo Local

### 1. Iniciar el backend BFF

```bash
cd backend
cp .env.example .env
# Edita .env y configura ZWAY_HOST, ZWAY_PORT, ZWAY_TOKEN
npm install
npm run dev
```

El backend arranca en `http://localhost:3000`.

### 2. Iniciar el frontend Angular

```bash
# Desde la raiz del proyecto
npm install
npm start
```

El frontend (Angular dev server) usara `http://localhost:3000` como API
(configurado en `src/environments/environment.ts`).

---

## Produccion (Kubernetes)

### Requisito previo: Crear el Secret con el token Z-Way

```bash
kubectl create secret generic blinds-backend-secret \
  --from-literal=ZWAY_TOKEN=tu-token-real-aqui \
  -n default
```

### Desplegar con el script

```bash
./deploy.sh
```

Esto construye las imagenes Docker del frontend y backend, las sube al
registro local y aplica los manifiestos de Kubernetes.

### Desplegar manualmente

```bash
# Construir imagenes
docker build -t blinds-control-app:latest -f Dockerfile .
docker build -t blinds-backend:latest -f backend/Dockerfile backend/

# Aplicar manifiestos
kubectl apply -f k8s/all-in-one.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Configuracion del backend (variables de entorno)

| Variable        | Descripcion                              | Ejemplo                           |
|-----------------|------------------------------------------|-----------------------------------|
| `PORT`          | Puerto del servidor backend              | `3000`                            |
| `ZWAY_HOST`     | IP/hostname del controlador Z-Way        | `192.168.1.109`                   |
| `ZWAY_PORT`     | Puerto del API Z-Way                     | `8083`                            |
| `ZWAY_PROTOCOL` | Protocolo (http/https)                   | `http`                            |
| `ZWAY_TOKEN`    | Token de sesion Z-Way (zwaysession)      | *(desde Kubernetes Secret)*       |
| `CORS_ORIGIN`   | Origenes CORS permitidos                 | `https://northr3nd.duckdns.org`   |

---

## Endpoints del BFF

| Metodo | Ruta                                    | Descripcion         |
|--------|-----------------------------------------|----------------------|
| GET    | `/api/devices/:deviceId/command/on`     | Subir persiana       |
| GET    | `/api/devices/:deviceId/command/off`    | Bajar persiana       |
| GET    | `/api/devices/:deviceId/command/stop`   | Detener persiana     |
| GET    | `/health`                               | Health check         |

El BFF traduce cada llamada a:
```
GET {ZWAY_PROTOCOL}://{ZWAY_HOST}:{ZWAY_PORT}/ZAutomation/api/v1/devices/{deviceId}/command/{command}
Header: zwaysession: {ZWAY_TOKEN}
```

---

## Verificar configuracion

### Consola del navegador (F12)

**Modo API activo:**
```
API configurada: https://northr3nd.duckdns.org
Llamando API: https://northr3nd.duckdns.org/api/devices/ZWayVDev_zway_3-0-38/command/on
Respuesta API: {...}
```

**Modo simulacion (sin API_URL):**
```
API_URL no configurada. Ejecutando en modo simulacion.
```

### Logs del backend

```bash
kubectl logs -f -l app=blinds-backend -n default
```

---

## Troubleshooting

### Error de CORS
El backend ya configura CORS. Verifica que `CORS_ORIGIN` en el ConfigMap
incluya el dominio del frontend.

### Error 502 / Bad Gateway
El backend no puede conectar con Z-Way. Verifica:
- `ZWAY_HOST` y `ZWAY_PORT` son correctos
- Z-Way esta accesible desde el cluster

### Error 401 / Unauthorized en Z-Way
El token es invalido o ha expirado. Actualiza el Secret:
```bash
kubectl delete secret blinds-backend-secret -n default
kubectl create secret generic blinds-backend-secret \
  --from-literal=ZWAY_TOKEN=nuevo-token \
  -n default
kubectl rollout restart deployment/blinds-backend -n default
```

---

## Flujo completo

```
Usuario (clic/voz)
    |
    v
Frontend Angular (navegador)
    |  GET /api/devices/{id}/command/{cmd}
    v
Ingress (Traefik) en northr3nd.duckdns.org
    |  /api/* --> blinds-backend-service:3000
    v
Backend BFF (Express)
    |  + header zwaysession: TOKEN
    |  GET http://192.168.1.109:8083/ZAutomation/api/v1/devices/{id}/command/{cmd}
    v
Z-Way API
    |
    v
Dispositivo fisico (motor de persiana)
```
