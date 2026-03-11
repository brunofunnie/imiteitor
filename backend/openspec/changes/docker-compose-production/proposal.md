## Why

The application currently runs as bare processes (uvicorn + vite dev server) with no containerization. To deploy on a VPS with a dedicated NVIDIA GPU, we need a reproducible, production-ready Docker setup that handles the backend (FastAPI + CUDA models), frontend (static build served by the backend), NVIDIA GPU passthrough, persistent data volumes, and process management.

## What Changes

- Add `Dockerfile` for the backend (Python + CUDA base image + uv + ffmpeg)
- Add `Dockerfile` for the frontend build stage (Node + npm build)
- Add `docker-compose.yml` for production orchestration with NVIDIA GPU runtime
- Add `.dockerignore` to exclude unnecessary files from build context
- Add `nginx.conf` for reverse proxy (TLS termination, static file serving, API proxying)
- Update `Makefile` with Docker build/deploy targets

## Capabilities

### New Capabilities
- `docker-production`: Production Docker Compose setup with NVIDIA GPU support, multi-stage builds, nginx reverse proxy, persistent volumes, and health checks

### Modified Capabilities

## Impact

- **New files**: `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `nginx.conf`
- **Modified files**: `Makefile` (new docker targets)
- **Infrastructure**: Requires Docker with `nvidia-container-toolkit` on the VPS
- **No code changes**: Backend and frontend source code remain untouched
