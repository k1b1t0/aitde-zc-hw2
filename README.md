# MiniKanban (Real-Time Collaborative Kanban Board)

A real-time collaborative Kanban board inspired by 90s terminal/cyberpunk aesthetics. It features live multi-user synchronization, WebSocket broadcasting, card locking, live typing indicators, JWT authentication with hashed passwords, and a database-agnostic backend powered by SQLite & SQLAlchemy.

---

## Features

- **Real-Time Collaboration**: Instant sync across connected clients via WebSockets (card creation, live typing, drag & drop, column reordering, deletions).
- **Edit Locking & Live Typing**: Ephemeral card locking to avoid edit collision and real-time live typing previews.
- **Authentication**: JWT Bearer token authentication, user registration/login modal with hashed passwords (`passlib`/`bcrypt`), demo user quick-switching, and auto-membership handling.
- **Database-Agnostic Storage**: SQLAlchemy ORM with SQLite by default (`DATABASE_URL`), ready for PostgreSQL or other relational DB engines.
- **90s Terminal Aesthetic**: Cyberpunk terminal styling with high-contrast neon accents, monospaced typography, and CRT scanlines.

---

## Prerequisites

- **Python 3.10+**
- **[uv](https://github.com/astral-sh/uv)** (Python package & environment manager)
- **Node.js 18+** & **npm**

---

## Quick Start

The fastest way to install and run the full stack is with the provided `Makefile`:

### 1. Install Dependencies

```bash
make install
```

This installs:
- Python dependencies in `backend/` using `uv sync`
- Node dependencies in `frontend/` using `npm install`

### 2. Run the Application

```bash
make run
```

This starts both services simultaneously:
- **Backend API**: `http://localhost:8000` (FastAPI + Swagger docs at `/docs`)
- **Frontend App**: `http://localhost:5173` (Vite dev server)

---

## Available Make Commands

| Command | Description |
|---|---|
| `make install` | Install dependencies for both backend (`uv`) and frontend (`npm`) |
| `make run` | Start both backend (port 8000) and frontend (port 5173) concurrently |
| `make run-backend` | Start only the FastAPI backend with auto-reload (`http://localhost:8000`) |
| `make run-frontend` | Start only the Vite frontend dev server (`http://localhost:5173`) |
| `make test` | Run all automated test suites (backend `pytest` + frontend `vitest`) |
| `make test-backend` | Run backend tests using `uv run pytest` |
| `make test-frontend` | Run frontend tests using Vitest |
| `make build-frontend`| Create production frontend bundle in `frontend/dist` |
| `make clean` | Clean test caches and build artifacts |

---

## Manual Execution (Without Make)

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Interactive OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- OpenAPI Specification: [openapi.yaml](file:///home/kibito/Desktop/repos/ai-dev-tool-zoomcamp/hw2/openapi.yaml)

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing Multi-User Collaboration

1. Open [http://localhost:5173](http://localhost:5173) in two side-by-side browser windows (e.g. normal window and incognito/private window).
2. Use the top-right user menu to log in with different accounts or register new ones (e.g. `batman@gmail.com` and `superman@gmail.com`).
3. Observe real-time features:
   - Live updates to cards, columns, and assignments across sessions.
   - Live stream indicator when someone types in a card.
   - Real-time card locking when a card editor is open.

---

## Configuration

The backend supports configuration via environment variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./kanban.db` | SQLAlchemy database connection string (e.g. SQLite, PostgreSQL) |
