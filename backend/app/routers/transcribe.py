import os
import subprocess
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.services.audio import save_uploaded_audio
from app.services.stt import transcribe, is_stt_loaded

router = APIRouter(prefix="/api", tags=["transcribe"])


class TranscribeResponse(BaseModel):
    text: str


def _convert_to_wav(input_path: str) -> str:
    """Convert any audio format to WAV using ffmpeg."""
    wav_path = tempfile.mktemp(suffix=".wav")
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", input_path,
            "-ar", "16000", "-ac", "1", "-sample_fmt", "s16",
            wav_path,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr.strip()}")
    return wav_path


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe an audio file to text using Whisper."""
    if not is_stt_loaded():
        raise HTTPException(503, "STT model not loaded yet. Please wait.")

    content = await file.read()
    ext = ".webm" if not file.filename else os.path.splitext(file.filename)[1] or ".webm"
    tmp_path = save_uploaded_audio(content, suffix=ext)
    wav_path = None

    try:
        # Convert to WAV (Whisper needs WAV, not webm/opus)
        wav_path = _convert_to_wav(str(tmp_path))
        text = transcribe(wav_path)
        return TranscribeResponse(text=text)
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")
    finally:
        os.unlink(tmp_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)
