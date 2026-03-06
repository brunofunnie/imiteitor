.PHONY: install install-backend install-frontend dev dev-backend dev-frontend build clean

# --- Setup ---

install: install-backend install-frontend ## Install all dependencies from scratch

install-backend: ## Install backend Python dependencies
	cd backend && uv sync

install-frontend: ## Install frontend Node dependencies
	cd frontend && npm install

# --- Development ---

dev: ## Run backend and frontend concurrently
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

# --- Cleanup ---

clean: ## Remove generated/installed artifacts
	rm -rf frontend/node_modules frontend/dist
	rm -rf backend/.venv
	rm -rf backend/data/db.sqlite3
