from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, boards, cards, columns, realtime
from app.store import store

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

@app.get("/")
def health_check():
    return {"status": "ok", "app": "Mini Collaborative Kanban API"}
