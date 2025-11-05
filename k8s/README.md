# Despliegue en Kubernetes (k3s) - Raspberry Pi 5

Esta guía te ayudará a desplegar la aplicación de control de persianas en tu cluster k3s en Raspberry Pi 5.

## 📋 Prerequisitos

- Cluster k3s funcionando en Raspberry Pi 5
- `kubectl` configurado y conectado al cluster
- Docker instalado para construir la imagen
- Acceso a un registry de imágenes (Docker Hub, GitHub Container Registry, o registry local)

## 🚀 Despliegue Rápido

### 1. Construir la Imagen Docker

```bash
# Opción A: Build para ARM64 (Raspberry Pi 5)
docker build --platform linux/arm64 \
  --build-arg API_URL=https://tu-api-iot.com \
  -t your-registry/blinds-control-app:latest .

# Opción B: Build sin especificar API_URL (se configura con ConfigMap)
docker build --platform linux/arm64 \
  -t your-registry/blinds-control-app:latest .

# Push al registry
docker push your-registry/blinds-control-app:latest
```

### 2. Configurar API_URL

Edita `k8s/configmap.yaml` y actualiza la URL de tu API:

```yaml
data:
  API_URL: "https://tu-api-iot.com"
```

### 3. Actualizar la Imagen en el Deployment

Edita `k8s/deployment.yaml` o `k8s/all-in-one.yaml` y actualiza:

```yaml
image: your-registry/blinds-control-app:latest
```

Por ejemplo:
- Docker Hub: `your-username/blinds-control-app:latest`
- GHCR: `ghcr.io/your-username/blinds-control-app:latest`

### 4. Desplegar en Kubernetes

```bash
# Opción A: Desplegar archivo all-in-one
kubectl apply -f k8s/all-in-one.yaml

# Opción B: Desplegar archivos individuales
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### 5. Verificar el Despliegue

```bash
# Ver pods
kubectl get pods -l app=blinds-control

# Ver servicio
kubectl get svc blinds-control-service

# Ver logs
kubectl logs -l app=blinds-control --tail=50

# Describir pod (útil para debugging)
kubectl describe pod -l app=blinds-control
```

## 🌐 Acceder a la Aplicación

La aplicación estará disponible en:

```
http://<IP-DE-TU-RASPBERRY>:30333
```

Por ejemplo:
- `http://192.168.1.100:30333`
- `http://raspberrypi.local:30333`

## 📝 Configuración Detallada

### ConfigMap

Contiene la configuración de la aplicación:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blinds-control-config
data:
  API_URL: "https://tu-api-iot.com"
```

**Para actualizar:**
```bash
kubectl edit configmap blinds-control-config
# O
kubectl apply -f k8s/configmap.yaml
# Luego reinicia los pods:
kubectl rollout restart deployment blinds-control-app
```

### Deployment

- **Réplicas:** 2 (alta disponibilidad)
- **Recursos:**
  - Request: 128Mi RAM, 100m CPU
  - Limit: 256Mi RAM, 500m CPU
- **Health Checks:** Liveness y Readiness probes configurados

**Para escalar:**
```bash
# Aumentar réplicas
kubectl scale deployment blinds-control-app --replicas=3

# O editar el deployment
kubectl edit deployment blinds-control-app
```

### Service (NodePort)

- **Tipo:** NodePort
- **Puerto interno:** 80
- **NodePort:** 30333
- **SessionAffinity:** ClientIP (mantiene sesiones)

## 🔧 Comandos Útiles

### Ver estado general
```bash
kubectl get all -l app=blinds-control
```

### Ver logs en tiempo real
```bash
kubectl logs -f -l app=blinds-control
```

### Reiniciar deployment
```bash
kubectl rollout restart deployment blinds-control-app
```

### Ver historial de despliegues
```bash
kubectl rollout history deployment blinds-control-app
```

### Rollback a versión anterior
```bash
kubectl rollout undo deployment blinds-control-app
```

### Eliminar todo
```bash
kubectl delete -f k8s/all-in-one.yaml
# O
kubectl delete deployment blinds-control-app
kubectl delete service blinds-control-service
kubectl delete configmap blinds-control-config
```

## 🐛 Troubleshooting

### Pods no inician (ImagePullBackOff)

```bash
# Verificar eventos
kubectl describe pod -l app=blinds-control

# Posibles soluciones:
# 1. Verificar que la imagen existe en el registry
# 2. Si es registry privado, crear imagePullSecrets
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=your-username \
  --docker-password=your-password

# Luego agregar al deployment:
# imagePullSecrets:
# - name: regcred
```

### Pods se reinician constantemente (CrashLoopBackOff)

```bash
# Ver logs
kubectl logs -l app=blinds-control --previous

# Verificar recursos
kubectl top pods -l app=blinds-control
```

### No puedo acceder desde el navegador

```bash
# Verificar que el servicio tiene el NodePort correcto
kubectl get svc blinds-control-service

# Verificar firewall en la Raspberry Pi
sudo ufw allow 30333/tcp
# O
sudo iptables -A INPUT -p tcp --dport 30333 -j ACCEPT

# Probar desde la misma Raspberry Pi
curl http://localhost:30333
```

### API_URL no se aplica

```bash
# Verificar ConfigMap
kubectl get configmap blinds-control-config -o yaml

# Verificar que los pods tienen la variable de entorno
kubectl exec -it <pod-name> -- env | grep API_URL

# Si no aparece, reiniciar pods
kubectl rollout restart deployment blinds-control-app
```

## 🔄 Actualizar la Aplicación

```bash
# 1. Construir nueva versión
docker build --platform linux/arm64 \
  -t your-registry/blinds-control-app:v2 .
docker push your-registry/blinds-control-app:v2

# 2. Actualizar imagen en deployment
kubectl set image deployment/blinds-control-app \
  blinds-control=your-registry/blinds-control-app:v2

# 3. Verificar rollout
kubectl rollout status deployment/blinds-control-app
```

## 📊 Monitoreo

### Métricas básicas
```bash
# CPU y memoria de los pods
kubectl top pods -l app=blinds-control

# Eventos recientes
kubectl get events --sort-by='.lastTimestamp' | grep blinds-control
```

### Logs agregados
```bash
# Todos los pods juntos
kubectl logs -l app=blinds-control --all-containers=true --tail=100

# Seguir logs de todos los pods
kubectl logs -f -l app=blinds-control --all-containers=true
```

## 🔐 Seguridad

### Usar HTTPS (con Ingress)

Si quieres exponer la app con HTTPS en lugar de NodePort:

```bash
# Instalar cert-manager (si no lo tienes)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Cambiar el Service a ClusterIP
# Crear un Ingress con TLS
```

Ver ejemplos en la documentación de k3s: https://docs.k3s.io/networking

## 📦 Usar Registry Local (Opcional)

Para evitar Docker Hub y tener las imágenes en tu red local:

```bash
# 1. Instalar registry local
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# 2. Build y push
docker build --platform linux/arm64 \
  -t localhost:5000/blinds-control-app:latest .
docker push localhost:5000/blinds-control-app:latest

# 3. Actualizar deployment para usar localhost:5000/...
```

## 🎯 Próximos Pasos

1. ✅ Verificar que la app funciona en `http://raspberry-pi-ip:30333`
2. ✅ Abrir la app en Chrome Android e instalarla como PWA
3. ✅ Configurar API_URL con tu backend IoT real
4. ✅ Opcional: Configurar Ingress para HTTPS
5. ✅ Opcional: Configurar backup automático de ConfigMaps

---

¡Tu app de control de persianas está lista en Kubernetes! 🎉
