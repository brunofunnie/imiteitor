import shutil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.config import VOICES_DIR
from app.database import get_db
from app.models import Voice, VoiceClip
from app.schemas import VoiceCreate, VoiceUpdate, VoiceResponse, VoiceListItem

router = APIRouter(prefix="/api/voices", tags=["voices"])


@router.get("", response_model=list[VoiceListItem])
def list_voices(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Voice.id,
            Voice.name,
            Voice.description,
            Voice.created_at,
            Voice.updated_at,
            func.count(VoiceClip.id).label("clip_count"),
        )
        .outerjoin(VoiceClip)
        .group_by(Voice.id)
        .order_by(Voice.created_at.desc())
        .all()
    )
    return [
        VoiceListItem(
            id=r.id,
            name=r.name,
            description=r.description,
            created_at=r.created_at,
            updated_at=r.updated_at,
            clip_count=r.clip_count,
        )
        for r in rows
    ]


@router.post("", response_model=VoiceResponse, status_code=201)
def create_voice(body: VoiceCreate, db: Session = Depends(get_db)):
    voice = Voice(name=body.name, description=body.description)
    db.add(voice)
    db.commit()
    db.refresh(voice)
    # Create directory for clips
    (VOICES_DIR / voice.id).mkdir(parents=True, exist_ok=True)
    return voice


@router.get("/{voice_id}", response_model=VoiceResponse)
def get_voice(voice_id: str, db: Session = Depends(get_db)):
    voice = (
        db.query(Voice)
        .options(joinedload(Voice.clips))
        .filter(Voice.id == voice_id)
        .first()
    )
    if not voice:
        raise HTTPException(404, "Voice not found")
    return voice


@router.put("/{voice_id}", response_model=VoiceResponse)
def update_voice(voice_id: str, body: VoiceUpdate, db: Session = Depends(get_db)):
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(404, "Voice not found")
    if body.name is not None:
        voice.name = body.name
    if body.description is not None:
        voice.description = body.description
    db.commit()
    db.refresh(voice)
    return voice


@router.delete("/{voice_id}", status_code=204)
def delete_voice(voice_id: str, db: Session = Depends(get_db)):
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(404, "Voice not found")
    # Delete audio files
    voice_dir = VOICES_DIR / voice_id
    if voice_dir.exists():
        shutil.rmtree(voice_dir)
    db.delete(voice)
    db.commit()
