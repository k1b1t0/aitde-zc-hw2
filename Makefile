.PHONY: help install run run-backend run-frontend test test-backend test-frontend test-integration test-e2e build-frontend clean docker-build docker-run compose-up compose-down

help:
	@echo "Available commands:"
	@echo "  make install          Install dependencies for both backend and frontend"
	@echo "  make run              Run both backend (port 8000) and frontend (port 5173)"
	@echo "  make run-backend      Run FastAPI backend with reload (http://localhost:8000)"
	@echo "  make run-frontend     Run Vite frontend dev server (http://localhost:5173)"
	@echo "  make test             Run unit tests (backend pytest + frontend vitest)"
	@echo "  make test-backend     Run backend unit tests with uv"
	@echo "  make test-frontend    Run frontend tests with vitest"
	@echo "  make test-integration Run integration tests against running docker compose stack"
	@echo "  make test-e2e         Run Playwright multi-user E2E tests against running stack"
	@echo "  make build-frontend   Build production frontend bundle"
	@echo "  make docker-build     Build multi-stage Docker image"
	@echo "  make docker-run       Run Docker container on port 8000"
	@echo "  make compose-up       Run full stack with Postgres using docker compose"
	@echo "  make compose-down     Stop docker compose services"
	@echo "  make clean            Clean caches and build artifacts"

install:
	@echo "==> Installing backend dependencies with uv..."
	cd backend && uv sync
	@echo "==> Installing frontend dependencies with npm..."
	cd frontend && npm install

run-backend:
	@echo "==> Starting FastAPI backend on http://localhost:8000..."
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	@echo "==> Starting Vite frontend on http://localhost:5173..."
	cd frontend && npm run dev -- --host 0.0.0.0 --port 5173

run:
	@echo "==> Starting backend and frontend concurrently..."
	@trap 'kill 0' EXIT; \
	(cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) & \
	(cd frontend && npm run dev -- --host 0.0.0.0 --port 5173) & \
	wait

test-backend:
	@echo "==> Running backend unit tests..."
	cd backend && uv run pytest tests/test_backend.py

test-frontend:
	@echo "==> Running frontend tests..."
	cd frontend && npm test

test-integration:
	@echo "==> Running integration tests against Docker Compose stack..."
	cd backend && uv run pytest tests/test_integration_compose.py

test-e2e:
	@echo "==> Running Playwright end-to-end tests against Docker Compose stack..."
	cd backend && uv run pytest ../e2e/test_collaboration_e2e.py

test: test-backend test-frontend

build-frontend:
	@echo "==> Building frontend for production..."
	cd frontend && npm run build

docker-build:
	@echo "==> Building multi-stage Docker image kanban-app:latest..."
	docker build -t kanban-app:latest .

docker-run:
	@echo "==> Running Docker container on http://localhost:8000..."
	docker run --rm -p 8000:8000 kanban-app:latest

compose-up:
	@echo "==> Starting Postgres and App via Docker Compose..."
	docker compose up --build

compose-down:
	@echo "==> Stopping Docker Compose services..."
	docker compose down

clean:
	@echo "==> Cleaning cache and build artifacts..."
	rm -rf backend/.pytest_cache backend/__pycache__ backend/app/__pycache__ backend/app/routers/__pycache__
	rm -rf frontend/dist
