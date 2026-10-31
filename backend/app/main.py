"""
EduSupport — FastAPI Application Entry Point
=============================================
Initialises the database, seeds demo data on first run,
mounts all routers, and configures CORS.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, SessionLocal
from app.models.models import Base

# Import all routers
from app.routers.auth import router as auth_router
from app.routers.students import router as students_router
from app.routers.subjects import router as subjects_router
from app.routers.attendance import router as attendance_router
from app.routers.assessments import router as assessments_router
from app.routers.assignments import router as assignments_router
from app.routers.risk import router as risk_router
from app.routers.interventions import router as interventions_router
from app.routers.dashboard import router as dashboard_router, reports_router

# ---------------------------------------------------------------------------
# Create FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "EduSupport: Early Identification of Students at Academic Risk. "
        "A Python-powered academic analytics platform."
    ),
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup event: initialise DB and seed demo data
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    """Create all database tables and optionally seed demo data."""
    Base.metadata.create_all(bind=engine)

    if settings.SEED_ON_STARTUP:
        from app.seed import seed_database
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(subjects_router)
app.include_router(attendance_router)
app.include_router(assessments_router)
app.include_router(assignments_router)
app.include_router(risk_router)
app.include_router(interventions_router)
app.include_router(dashboard_router)
app.include_router(reports_router)


@app.get("/api/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# ---------------------------------------------------------------------------
# Serve Production Frontend (Single-server deployment)
# ---------------------------------------------------------------------------
FRONTEND_DIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

if os.path.exists(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            return {"detail": "Not Found"}
        target_file = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))
