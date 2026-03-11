## Context

Imiteitor is a FastAPI + React app that runs TTS voice cloning using Qwen3-TTS on CUDA and STT via faster-whisper. It needs to be deployed on a VPS with a dedicated NVIDIA GPU. Currently there is no containerization — the app runs via `make dev` with uvicorn and vite dev server.

The backend serves the built frontend static files in production mode (already implemented in `main.py`). The backend uses SQLite (file-based) and stores audio files in `backend/data/`.

## Goals / Non-Goals

**Goals:**
- Single `docker compose up` to run the full production stack
- NVIDIA GPU passthrough to the backend container
- Persistent storage for SQLite database and audio files
- Nginx reverse proxy for TLS termination and static asset caching
- Multi-stage Docker builds for minimal image sizes
- Health checks for automatic restart on failure

**Non-Goals:**
- Kubernetes / orchestration beyond Docker Compose
- CI/CD pipeline (deploy manually for now)
- Horizontal scaling (single-user app, single GPU)
- Automatic TLS certificate provisioning (user provides certs or uses Cloudflare)
- Model caching in Docker volumes (models download to HuggingFace cache inside container)

## Decisions

### 1. Single backend container with frontend baked in

**Rationale:** The FastAPI app already serves the built frontend via `StaticFiles` and a catch-all route. Build the frontend in a multi-stage Docker build, copy `dist/` into the backend image. No separate frontend container needed.

**Alternative considered:** Separate frontend container with nginx. Rejected: unnecessary complexity for a single-user app where the backend already serves static files.

### 2. Base image: `nvidia/cuda:12.6.3-runtime-ubuntu24.04`

**Rationale:** Matches the CUDA 12.6 version from our PyTorch wheels (`cu126`). Runtime image (not devel) keeps size down since we only need inference, not compilation. Ubuntu 24.04 for up-to-date system packages.

**Alternative considered:** `python:3.12-slim` + manual CUDA install. Rejected: harder to maintain, larger risk of version mismatches.

### 3. Nginx as reverse proxy in a separate container

**Rationale:** Handles TLS termination, static asset caching with long expiry, request buffering, and connection limits. Keeps the backend focused on API + ML inference.

**Configuration:** Proxy `/api/*` and `/health` to backend:8000. Serve a simple upstream config. TLS certs mounted from host volume.

### 4. HuggingFace model cache as a named Docker volume

**Rationale:** Models are large (3-5 GB each). Persisting the HF cache avoids re-downloading on container restart. Mount `hf-cache` volume at `/root/.cache/huggingface`.

### 5. Data persistence via bind mount

**Rationale:** SQLite DB and audio files in `backend/data/` need to persist across container rebuilds. Bind mount `./data` on the host to `/app/backend/data` in the container for easy backup access.

## Risks / Trade-offs

- **[Large image size]** CUDA runtime + Python + ML dependencies will produce a ~8-10 GB image → Mitigation: Multi-stage build, runtime-only CUDA image, `.dockerignore` to minimize context
- **[Model download on first start]** First `docker compose up` will take time to download models → Mitigation: HF cache volume persists across restarts; document in README
- **[SQLite under Docker]** SQLite with bind mounts can have locking issues on some storage drivers → Mitigation: Single-user app with serial access; not a practical concern
- **[GPU driver compatibility]** Host NVIDIA driver must be compatible with CUDA 12.6 in the container → Mitigation: Document minimum driver version (>=560.x); nvidia-container-toolkit handles the rest

## Migration Plan

1. Install `nvidia-container-toolkit` on VPS
2. Clone repo, place TLS certs in `certs/` directory
3. `docker compose up -d --build`
4. Models download on first startup (5-10 min depending on bandwidth)
5. Rollback: `docker compose down`, run previous version
