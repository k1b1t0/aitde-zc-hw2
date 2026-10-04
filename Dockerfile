# Multi-stage Dockerfile:
# Stage 1: Build the React frontend with Node
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build and run FastAPI backend with uv and Python
FROM python:3.13-slim AS runner

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    STATIC_DIR=/app/static \
    DATABASE_URL=sqlite:////app/data/kanban.db

# Copy backend dependency declarations
COPY backend/pyproject.toml backend/uv.lock ./

# Install backend dependencies without installing root project package
RUN uv sync --frozen --no-install-project --no-dev

# Copy backend application code
COPY backend/app ./app
COPY backend/main.py ./

# Copy built frontend static files from Stage 1 into /app/static
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create data directory for SQLite database storage
RUN mkdir -p /app/data

EXPOSE 8000

# Run FastAPI app using uvicorn through uv
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
