import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import FRONTEND_URL, TTS_MODEL
from app.database import engine, Base
from app.routers.voices import router as voices_router
from app.routers.clips import router as clips_router
from app.routers.tts import router as tts_router, health_router
from app.routers.transcribe import router as transcribe_router
from app.services.tts import load_tts_model
from app.services.stt import load_stt_model

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _load_models_background():
    try:
        load_tts_model(TTS_MODEL)
    except Exception as e:
        logger.error(f"Failed to load TTS model: {e}")
        logger.warning("App will run without TTS capability.")

    try:
        load_stt_model()
    except Exception as e:
        logger.error(f"Failed to load STT model: {e}")
        logger.warning("App will run without auto-transcription.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    # Load models in background so API is available immediately
    thread = threading.Thread(target=_load_models_background, daemon=True)
    thread.start()
    logger.info("Models loading started in background")

    yield
    # Shutdown
    logger.info("Shutting down")


app = FastAPI(
    title="Imiteitor",
    description="TTS voice cloning app using Qwen3-TTS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voices_router)
app.include_router(clips_router)
app.include_router(tts_router)
app.include_router(transcribe_router)
app.include_router(health_router)

# Serve frontend static files in production
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # Serve index.html for all non-API routes (SPA routing)
        file = FRONTEND_DIST / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
