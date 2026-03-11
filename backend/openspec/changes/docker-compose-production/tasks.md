## 1. Docker Ignore

- [x] 1.1 Create `.dockerignore` excluding `.git/`, `node_modules/`, `__pycache__/`, `.venv/`, `backend/data/`, `*.md`, `openspec/`

## 2. Dockerfile (multi-stage)

- [x] 2.1 Create `Dockerfile` with Node stage to build frontend (`npm ci && npm run build`)
- [x] 2.2 Add backend stage based on `nvidia/cuda:12.6.3-runtime-ubuntu24.04` with Python 3.12, uv, and ffmpeg
- [x] 2.3 Copy built frontend `dist/` into backend stage at the expected path
- [x] 2.4 Install backend Python dependencies with `uv sync`
- [x] 2.5 Set entrypoint to run uvicorn on port 8000

## 3. Nginx Configuration

- [x] 3.1 Create `nginx.conf` with HTTPS server block proxying to backend:8000
- [x] 3.2 Add HTTP-to-HTTPS redirect server block on port 80
- [x] 3.3 Configure TLS cert/key paths expecting `/etc/nginx/certs/` mount
- [x] 3.4 Add proxy headers (X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)

## 4. Docker Compose

- [x] 4.1 Create `docker-compose.yml` with backend service using NVIDIA GPU runtime and resource reservations
- [x] 4.2 Add nginx service with ports 80/443 exposed, depends_on backend
- [x] 4.3 Add bind mount `./data:/app/backend/data` for persistent SQLite + audio storage
- [x] 4.4 Add named volume `hf-cache` mounted at `/root/.cache/huggingface` for model cache
- [x] 4.5 Add bind mount `./certs:/etc/nginx/certs:ro` for TLS certificates
- [x] 4.6 Add health check for backend container (`curl http://localhost:8000/api/health`)
- [x] 4.7 Set restart policy `unless-stopped` for both services

## 5. Makefile Updates

- [x] 5.1 Add `docker-build` target to build the production image
- [x] 5.2 Add `docker-up` and `docker-down` targets for compose up/down
