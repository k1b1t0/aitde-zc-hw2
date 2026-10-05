import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import auth, boards, cards, columns, realtime
from app.store import store
from app.telemetry import setup_telemetry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed demo data if empty
    store.init_db()
    yield

app = FastAPI(
    title="Mini Collaborative Kanban API",
    description="FastAPI implementation of the Mini Collaborative Kanban backend spec",
    version="1.0.0",
    lifespan=lifespan,
)

# Instrument backend with OpenTelemetry
setup_telemetry(app)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(boards.router, prefix="/api/v1")
app.include_router(columns.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")
app.include_router(realtime.router, prefix="/api/v1")

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "app": "Mini Collaborative Kanban API"}

# Static files / SPA serving setup
# Priority: STATIC_DIR env var, frontend/dist (monorepo root), or /app/static (Docker container)
static_dir_env = os.getenv("STATIC_DIR")
if static_dir_env:
    STATIC_DIR = Path(static_dir_env)
else:
    candidates = [
        Path("/app/static"),
        Path(__file__).resolve().parent.parent / "static",
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
        Path("static"),
    ]
    STATIC_DIR = next((p for p in candidates if p.exists() and (p / "index.html").exists()), None)

if STATIC_DIR and (STATIC_DIR / "index.html").exists():
    # Mount assets subfolder if present
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
else:
    @app.get("/")
    def root_health_check():
        return {"status": "ok", "app": "Mini Collaborative Kanban API"}

