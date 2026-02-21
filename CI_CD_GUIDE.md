# Sistema de Despliegue Automático (CI/CD) - home-manager

Este proyecto utiliza un sistema de despliegue continuo para su **Frontend (Angular)** y su **Backend (Node.js)**.

## Arquitectura del Sistema

El flujo de trabajo sigue el modelo de "GitOps" con versionado semántico:

1.  **Versionado**: El archivo `VERSION` en la raíz es la fuente de verdad para ambos componentes.
2.  **Automatización**: El script `release.sh` gestiona el incremento de versión y la actualización de los dos despliegues (`k8s/deployment.yaml` y `k8s/backend-deployment.yaml`).
3.  **Pipeline**: GitHub Actions compila ambas imágenes para `linux/amd64` y `linux/arm64`.
4.  **Despliegue**: ArgoCD sincroniza los cambios al detectar las nuevas etiquetas de versión en Git.

## Cómo realizar un Release

Para desplegar una nueva versión (Front + Back simultáneamente), utiliza el script `release.sh`:

```bash
./release.sh patch "Mejoras en el panel de persianas"
```

### ¿Qué hace el script?
1.  Calcula la siguiente versión.
2.  Actualiza el archivo `VERSION`.
3.  Actualiza las imágenes en `k8s/deployment.yaml` y `k8s/backend-deployment.yaml`.
4.  Crea un commit de release y un **Git Tag** (ej: `v1.0.1`).
5.  Sube todo a GitHub, disparando la construcción de ambas imágenes.

## Pipeline de GitHub Actions

El workflow en `.github/workflows/ci-cd.yml` realiza:
*   **Tests**: Ejecuta los tests de Angular (ChromeHeadless).
*   **Build Frontend**: Genera `ghcr.io/n0rthr3nd/home-manager:v1.0.x`.
*   **Build Backend**: Genera `ghcr.io/n0rthr3nd/home-manager-backend:v1.0.x`.
*   **Sync**: Notifica a la API de ArgoCD para sincronizar la aplicación `home-manager`.

## Ventajas
*   **Sincronización**: El Front y el Back siempre suben de versión juntos, manteniendo la compatibilidad.
*   **Rollbacks**: Puedes volver a cualquier versión anterior de todo el ecosistema con un solo comando de Git.
*   **Multi-arch**: Optimizado para ejecutarse en Raspberry Pi.

---
🤖 *Documentación generada automáticamente por Gemini CLI.*
