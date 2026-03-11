.PHONY: install install-backend install-frontend dev dev-backend dev-frontend build clean certs docker-build docker-up docker-down docker-logs

# --- Setup ---

install: install-backend install-frontend ## Install all dependencies from scratch

install-backend: ## Install backend Python dependencies
	cd backend && uv sync

install-frontend: ## Install frontend Node dependencies
	cd frontend && npm install

# --- Development ---

dev: ## Run backend and frontend concurrently
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend: ## Run backend only
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend: ## Run frontend only
	cd frontend && npm run dev

# --- Build ---

build: install-frontend ## Build frontend for production
	cd frontend && npm run build

# --- Certificates ---

DOMAIN ?= $(shell hostname -I | awk '{print $$1}')

certs: ## Generate self-signed TLS cert. Usage: make certs DOMAIN=myhost.lan
	mkdir -p certs
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout certs/privkey.pem \
		-out certs/fullchain.pem \
		-subj "/CN=$(DOMAIN)" \
		-addext "subjectAltName=DNS:$(DOMAIN),IP:$(shell hostname -I | awk '{print $$1}')"
	@echo "Certificate generated for $(DOMAIN) in certs/"

# --- Docker ---

docker-build: ## Build production Docker image
	docker compose build

docker-up: ## Start production stack (requires NVIDIA GPU + certs/)
	docker compose up -d

docker-down: ## Stop production stack
	docker compose down

docker-logs: ## Tail production logs
	docker compose logs -f

# --- Cleanup ---

clean: ## Remove generated/installed artifacts
	rm -rf frontend/node_modules frontend/dist
	rm -rf backend/.venv
	rm -rf backend/data/db.sqlite3
