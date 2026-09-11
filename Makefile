.PHONY: help install run run-backend run-frontend test test-backend test-frontend build-frontend clean

help:
	@echo "Available commands:"
	@echo "  make install         Install dependencies for both backend and frontend"
	@echo "  make run             Run both backend (port 8000) and frontend (port 5173)"
	@echo "  make run-backend     Run FastAPI backend with reload (http://localhost:8000)"
	@echo "  make run-frontend    Run Vite frontend dev server (http://localhost:5173)"
	@echo "  make test            Run all tests (backend pytest + frontend vitest)"
	@echo "  make test-backend    Run backend tests with uv"
	@echo "  make test-frontend   Run frontend tests with vitest"
	@echo "  make build-frontend  Build production frontend bundle"
	@echo "  make clean           Clean caches and build artifacts"

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
	@echo "==> Running backend tests..."
	cd backend && uv run pytest

test-frontend:
	@echo "==> Running frontend tests..."
	cd frontend && npm test

test: test-backend test-frontend

build-frontend:
	@echo "==> Building frontend for production..."
	cd frontend && npm run build

clean:
	@echo "==> Cleaning cache and build artifacts..."
	rm -rf backend/.pytest_cache backend/__pycache__ backend/app/__pycache__ backend/app/routers/__pycache__
	rm -rf frontend/dist
