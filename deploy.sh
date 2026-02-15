#!/bin/bash

# Script de compilacion y despliegue para k3s
# Compila frontend Angular + backend BFF, construye imagenes Docker,
# las sube al registro local y despliega en k3s

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Despliegue de Blinds Control App${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Configuracion por defecto
API_URL="${API_URL:-https://northr3nd.duckdns.org}"

# 2. Cargar variables de entorno si existe .env
if [ -f .env ]; then
    echo -e "\n${YELLOW}[1/8] Cargando configuracion desde .env...${NC}"
    source .env
else
    echo -e "\n${YELLOW}[1/8] Usando configuracion por defecto...${NC}"
fi
echo "API_URL: $API_URL"

# 3. Construir imagen Docker del frontend
echo -e "\n${YELLOW}[2/8] Construyendo imagen Docker del frontend...${NC}"
docker build \
    --build-arg API_URL=$API_URL \
    --platform linux/arm64 \
    -t blinds-control-app:latest \
    -f Dockerfile \
    .
echo -e "${GREEN}Imagen frontend construida exitosamente${NC}"

# 4. Construir imagen Docker del backend BFF
echo -e "\n${YELLOW}[3/8] Construyendo imagen Docker del backend BFF...${NC}"
docker build \
    --platform linux/arm64 \
    -t blinds-backend:latest \
    -f backend/Dockerfile \
    backend/
echo -e "${GREEN}Imagen backend construida exitosamente${NC}"

# 5. Etiquetar para el registro local
echo -e "\n${YELLOW}[4/8] Etiquetando imagenes para registro local...${NC}"
docker tag blinds-control-app:latest localhost:5000/blinds-control-app:latest
docker tag blinds-backend:latest localhost:5000/blinds-backend:latest
echo -e "${GREEN}Imagenes etiquetadas${NC}"

# 6. Subir al registro local de k3s
echo -e "\n${YELLOW}[5/8] Subiendo imagenes al registro local...${NC}"
docker push localhost:5000/blinds-control-app:latest
docker push localhost:5000/blinds-backend:latest
echo -e "${GREEN}Imagenes subidas al registro${NC}"

# 7. Aplicar manifiestos de Kubernetes
echo -e "\n${YELLOW}[6/8] Aplicando manifiestos de Kubernetes...${NC}"
sudo kubectl apply -f k8s/all-in-one.yaml
echo -e "${GREEN}Manifiestos aplicados${NC}"

# 8. Reiniciar deployments para forzar pull de las nuevas imagenes
echo -e "\n${YELLOW}[7/8] Reiniciando deployments...${NC}"
sudo kubectl rollout restart deployment/blinds-control-app -n default
sudo kubectl rollout restart deployment/blinds-backend -n default
echo -e "${GREEN}Deployments reiniciados${NC}"

# 9. Esperar a que los rollouts se completen
echo -e "\n${YELLOW}[8/8] Esperando a que los deployments esten listos...${NC}"
sudo kubectl rollout status deployment/blinds-control-app -n default --timeout=300s
sudo kubectl rollout status deployment/blinds-backend -n default --timeout=300s

# 10. Mostrar informacion del deployment
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Despliegue completado exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Estado de los pods (frontend):${NC}"
sudo kubectl get pods -n default -l app=blinds-control

echo -e "\n${YELLOW}Estado de los pods (backend):${NC}"
sudo kubectl get pods -n default -l app=blinds-backend

echo -e "\n${YELLOW}Servicios:${NC}"
sudo kubectl get service blinds-control-service blinds-backend-service -n default

echo -e "\n${GREEN}La aplicacion esta disponible en:${NC}"
echo -e "  Frontend: https://northr3nd.duckdns.org/blinds-control/"
echo -e "  API BFF:  https://northr3nd.duckdns.org/api/"
echo -e "\nPara ver logs:"
echo -e "  Frontend: kubectl logs -f -l app=blinds-control -n default"
echo -e "  Backend:  kubectl logs -f -l app=blinds-backend -n default"
echo -e "\n${RED}IMPORTANTE: Asegurate de que el Secret 'blinds-backend-secret' existe:${NC}"
echo -e "  kubectl create secret generic blinds-backend-secret --from-literal=ZWAY_TOKEN=tu-token -n default"
