import uuid
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Voice(Base):
    __tablename__ = "voices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    clips: Mapped[list["VoiceClip"]] = relationship(
        back_populates="voice", cascade="all, delete-orphan"
    )
    generated_audios: Mapped[list["GeneratedAudio"]] = relationship(
        back_populates="voice", cascade="all, delete-orphan"
    )


class VoiceClip(Base):
    __tablename__ = "voice_clips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    voice_id: Mapped[str] = mapped_column(String(36), ForeignKey("voices.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    sample_rate: Mapped[int] = mapped_column(Integer, default=24000)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    voice: Mapped["Voice"] = relationship(back_populates="clips")


class GeneratedAudio(Base):
    __tablename__ = "generated_audios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    voice_id: Mapped[str] = mapped_column(String(36), ForeignKey("voices.id"), nullable=False)
    clip_id: Mapped[str] = mapped_column(String(36), ForeignKey("voice_clips.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    duration: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    voice: Mapped["Voice"] = relationship(back_populates="generated_audios")
    clip: Mapped["VoiceClip"] = relationship()
