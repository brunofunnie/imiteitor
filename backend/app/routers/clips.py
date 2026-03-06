import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import VOICES_DIR
from app.database import get_db
from app.models import Voice, VoiceClip
from app.schemas import ClipResponse, ClipUpdateTranscript
from app.services.audio import (
    process_audio_clip,
    save_uploaded_audio,
    AudioValidationError,
)

router = APIRouter(prefix="/api/voices/{voice_id}/clips", tags=["clips"])

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".opus"}


def _get_voice_or_404(voice_id: str, db: Session) -> Voice:
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(404, "Voice not found")
    return voice


@router.get("", response_model=list[ClipResponse])
def list_clips(voice_id: str, db: Session = Depends(get_db)):
    _get_voice_or_404(voice_id, db)
    clips = (
        db.query(VoiceClip)
        .filter(VoiceClip.voice_id == voice_id)
        .order_by(VoiceClip.created_at)
        .all()
    )
    return clips


@router.post("", response_model=ClipResponse, status_code=201)
async def upload_clip(
    voice_id: str,
    transcript: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an audio file as a voice clip."""
    _get_voice_or_404(voice_id, db)

    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Save to temp file
    content = await file.read()
    tmp_path = save_uploaded_audio(content, suffix=ext)

    try:
        # Create clip record to get an ID
        clip = VoiceClip(
            voice_id=voice_id,
            filename="",  # will be set after processing
            duration=0,
            transcript=transcript,
        )
        db.add(clip)
        db.flush()  # get the ID

        # Process audio
        voice_dir = VOICES_DIR / voice_id
        voice_dir.mkdir(parents=True, exist_ok=True)
        output_path = voice_dir / f"{clip.id}.wav"

        duration = process_audio_clip(tmp_path, output_path)

        clip.filename = f"{clip.id}.wav"
        clip.duration = duration
        db.commit()
        db.refresh(clip)
        return clip

    except AudioValidationError as e:
        db.rollback()
        raise HTTPException(400, str(e))
    finally:
        os.unlink(tmp_path)


@router.post("/record", response_model=ClipResponse, status_code=201)
async def record_clip(
    voice_id: str,
    transcript: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a recorded audio blob from the browser."""
    _get_voice_or_404(voice_id, db)

    content = await file.read()
    # Browser recordings are typically webm/opus
    tmp_path = save_uploaded_audio(content, suffix=".webm")

    try:
        clip = VoiceClip(
            voice_id=voice_id,
            filename="",
            duration=0,
            transcript=transcript,
        )
        db.add(clip)
        db.flush()

        voice_dir = VOICES_DIR / voice_id
        voice_dir.mkdir(parents=True, exist_ok=True)
        output_path = voice_dir / f"{clip.id}.wav"

        duration = process_audio_clip(tmp_path, output_path)

        clip.filename = f"{clip.id}.wav"
        clip.duration = duration
        db.commit()
        db.refresh(clip)
        return clip

    except AudioValidationError as e:
        db.rollback()
        raise HTTPException(400, str(e))
    finally:
        os.unlink(tmp_path)


@router.get("/{clip_id}", response_model=ClipResponse)
def get_clip(voice_id: str, clip_id: str, db: Session = Depends(get_db)):
    clip = (
        db.query(VoiceClip)
        .filter(VoiceClip.id == clip_id, VoiceClip.voice_id == voice_id)
        .first()
    )
    if not clip:
        raise HTTPException(404, "Clip not found")
    return clip


@router.get("/{clip_id}/audio")
def get_clip_audio(voice_id: str, clip_id: str, db: Session = Depends(get_db)):
    clip = (
        db.query(VoiceClip)
        .filter(VoiceClip.id == clip_id, VoiceClip.voice_id == voice_id)
        .first()
    )
    if not clip:
        raise HTTPException(404, "Clip not found")

    file_path = VOICES_DIR / voice_id / clip.filename
    if not file_path.exists():
        raise HTTPException(404, "Audio file not found")

    return FileResponse(file_path, media_type="audio/wav", filename=clip.filename)


@router.put("/{clip_id}", response_model=ClipResponse)
def update_clip_transcript(
    voice_id: str, clip_id: str, body: ClipUpdateTranscript, db: Session = Depends(get_db)
):
    clip = (
        db.query(VoiceClip)
        .filter(VoiceClip.id == clip_id, VoiceClip.voice_id == voice_id)
        .first()
    )
    if not clip:
        raise HTTPException(404, "Clip not found")
    clip.transcript = body.transcript
    db.commit()
    db.refresh(clip)
    return clip


@router.delete("/{clip_id}", status_code=204)
def delete_clip(voice_id: str, clip_id: str, db: Session = Depends(get_db)):
    clip = (
        db.query(VoiceClip)
        .filter(VoiceClip.id == clip_id, VoiceClip.voice_id == voice_id)
        .first()
    )
    if not clip:
        raise HTTPException(404, "Clip not found")

    # Delete audio file
    file_path = VOICES_DIR / voice_id / clip.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(clip)
    db.commit()
