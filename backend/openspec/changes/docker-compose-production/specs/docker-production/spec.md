## ADDED Requirements

### Requirement: Docker Compose production stack
The system SHALL provide a `docker-compose.yml` that orchestrates the backend and nginx containers for production deployment on a VPS with a dedicated NVIDIA GPU.

#### Scenario: Start full stack
- **WHEN** the user runs `docker compose up -d --build`
- **THEN** the backend container starts with CUDA GPU access and the nginx container starts as a reverse proxy, both connected via a shared Docker network

#### Scenario: Stop full stack
- **WHEN** the user runs `docker compose down`
- **THEN** all containers stop gracefully and no data is lost (volumes persist)

### Requirement: NVIDIA GPU passthrough
The backend container SHALL have access to the host's NVIDIA GPU via the NVIDIA Container Toolkit runtime. The `docker-compose.yml` SHALL declare GPU resource reservations.

#### Scenario: GPU available in container
- **WHEN** the backend container starts on a host with `nvidia-container-toolkit` installed
- **THEN** `nvidia-smi` is accessible inside the container and CUDA is available to PyTorch

### Requirement: Multi-stage backend Docker build
The system SHALL use a multi-stage Dockerfile that builds the frontend in a Node stage, then assembles the backend image with the built frontend assets. The final image SHALL use `nvidia/cuda:12.6.3-runtime-ubuntu24.04` as the base.

#### Scenario: Frontend assets included in backend image
- **WHEN** the Docker image is built
- **THEN** the `frontend/dist/` directory exists inside the backend container at the expected path

#### Scenario: Python dependencies installed
- **WHEN** the Docker image is built
- **THEN** `uv sync` has installed all backend dependencies including `qwen-tts`, `torch` (CUDA), and `faster-whisper`

### Requirement: Persistent data storage
The system SHALL persist the SQLite database and audio files across container restarts using a bind mount from the host filesystem to the container's data directory.

#### Scenario: Data survives container rebuild
- **WHEN** the user runs `docker compose down` followed by `docker compose up -d --build`
- **THEN** all voices, clips, and generated audio from before the rebuild are still available

### Requirement: HuggingFace model cache persistence
The system SHALL use a named Docker volume for the HuggingFace model cache to avoid re-downloading models on container restart.

#### Scenario: Models cached across restarts
- **WHEN** the backend container is restarted
- **THEN** previously downloaded models are loaded from the cache volume without re-downloading

### Requirement: Nginx reverse proxy
The system SHALL include an nginx container that proxies API requests to the backend and serves TLS-terminated HTTPS.

#### Scenario: HTTPS request proxied to backend
- **WHEN** a client sends an HTTPS request to the nginx container on port 443
- **THEN** nginx terminates TLS and proxies the request to the backend container on port 8000

#### Scenario: HTTP redirect to HTTPS
- **WHEN** a client sends an HTTP request to port 80
- **THEN** nginx responds with a 301 redirect to the HTTPS equivalent URL

### Requirement: Health checks
The backend container SHALL define a health check that verifies the API is responsive.

#### Scenario: Healthy backend
- **WHEN** the backend API is running and responding
- **THEN** the Docker health check reports the container as healthy

#### Scenario: Unhealthy backend
- **WHEN** the backend API stops responding
- **THEN** the Docker health check reports the container as unhealthy and Docker restarts it based on the restart policy

### Requirement: Docker ignore file
The system SHALL include a `.dockerignore` file that excludes unnecessary files from the build context to minimize image size and build time.

#### Scenario: Excluded files
- **WHEN** the Docker image is built
- **THEN** `.git/`, `node_modules/`, `__pycache__/`, `.venv/`, `backend/data/`, and `*.md` are excluded from the build context
