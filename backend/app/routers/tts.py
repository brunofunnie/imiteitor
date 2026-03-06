from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import VOICES_DIR, GENERATED_DIR
from app.database import get_db
from app.models import Voice, VoiceClip, GeneratedAudio
from app.schemas import TTSRequest, TTSResponse, HealthResponse
from app.services.tts import generate_speech, is_model_loaded, get_model_name
from app.services.audio import postprocess_audio, AudioValidationError

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.post("/generate", response_model=TTSResponse, status_code=201)
def generate_audio(body: TTSRequest, db: Session = Depends(get_db)):
    if not is_model_loaded():
        raise HTTPException(503, "TTS model not loaded yet. Please wait.")

    # Validate voice exists
    voice = db.query(Voice).filter(Voice.id == body.voice_id).first()
    if not voice:
        raise HTTPException(404, "Voice not found")

    # Get reference clip
    if body.clip_id:
        clip = (
            db.query(VoiceClip)
            .filter(VoiceClip.id == body.clip_id, VoiceClip.voice_id == body.voice_id)
            .first()
        )
        if not clip:
            raise HTTPException(404, "Clip not found")
    else:
        # Auto-select: pick the longest clip for best quality
        clip = (
            db.query(VoiceClip)
            .filter(VoiceClip.voice_id == body.voice_id)
            .order_by(VoiceClip.duration.desc())
            .first()
        )
        if not clip:
            raise HTTPException(400, "Voice has no clips. Add at least one clip first.")

    ref_audio_path = str(VOICES_DIR / body.voice_id / clip.filename)

    try:
        wav_bytes, duration = generate_speech(
            text=body.text,
            ref_audio_path=ref_audio_path,
            ref_text=clip.transcript,
            temperature=body.temperature,
            top_k=body.top_k,
            top_p=body.top_p,
            repetition_penalty=body.repetition_penalty,
            speed=body.speed,
        )
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed: {e}")

    # Save generated audio
    record = GeneratedAudio(
        voice_id=body.voice_id,
        clip_id=clip.id,
        text=body.text,
        filename="",
        duration=duration,
    )
    db.add(record)
    db.flush()

    filename = f"{record.id}.wav"
    output_path = GENERATED_DIR / filename
    output_path.write_bytes(wav_bytes)

    # Apply post-processing (EQ / normalization) if requested
    needs_postprocess = body.bass_gain != 0.0 or body.treble_gain != 0.0 or body.normalize
    if needs_postprocess:
        try:
            processed_path = GENERATED_DIR / f"{record.id}_eq.wav"
            postprocess_audio(
                output_path, processed_path,
                bass_gain=body.bass_gain,
                treble_gain=body.treble_gain,
                normalize=body.normalize,
            )
            # Replace original with processed version
            processed_path.replace(output_path)
            # Re-read duration after processing
            from app.services.audio import get_audio_duration
            duration = get_audio_duration(output_path)
            record.duration = duration
        except AudioValidationError as e:
            # Post-processing failed but we still have the raw audio
            pass

    record.filename = filename
    db.commit()
    db.refresh(record)

    return TTSResponse(
        id=record.id,
        voice_id=record.voice_id,
        clip_id=record.clip_id,
        text=record.text,
        audio_url=f"/api/tts/{record.id}/audio",
        duration=record.duration,
        created_at=record.created_at,
    )


@router.get("/history", response_model=list[TTSResponse])
def list_history(voice_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(GeneratedAudio).order_by(GeneratedAudio.created_at.desc())
    if voice_id:
        query = query.filter(GeneratedAudio.voice_id == voice_id)
    records = query.limit(50).all()
    return [
        TTSResponse(
            id=r.id,
            voice_id=r.voice_id,
            clip_id=r.clip_id,
            text=r.text,
            audio_url=f"/api/tts/{r.id}/audio",
            duration=r.duration,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{audio_id}/audio")
def get_generated_audio(audio_id: str, db: Session = Depends(get_db)):
    record = db.query(GeneratedAudio).filter(GeneratedAudio.id == audio_id).first()
    if not record:
        raise HTTPException(404, "Generated audio not found")

    file_path = GENERATED_DIR / record.filename
    if not file_path.exists():
        raise HTTPException(404, "Audio file not found")

    return FileResponse(file_path, media_type="audio/wav", filename=record.filename)


@router.delete("/{audio_id}", status_code=204)
def delete_generated_audio(audio_id: str, db: Session = Depends(get_db)):
    record = db.query(GeneratedAudio).filter(GeneratedAudio.id == audio_id).first()
    if not record:
        raise HTTPException(404, "Generated audio not found")

    file_path = GENERATED_DIR / record.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(record)
    db.commit()


# --- Health ---

health_router = APIRouter(tags=["system"])


@health_router.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=is_model_loaded(),
        model_name=get_model_name(),
    )
