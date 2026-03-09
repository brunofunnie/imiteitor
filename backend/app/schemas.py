from datetime import datetime

from pydantic import BaseModel, ConfigDict


# --- Voice ---

class VoiceCreate(BaseModel):
    name: str
    description: str | None = None


class VoiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ClipSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    duration: float
    transcript: str
    created_at: datetime


class VoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    clips: list[ClipSummary] = []


class VoiceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    clip_count: int
    created_at: datetime
    updated_at: datetime


# --- Clip ---

class ClipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    voice_id: str
    filename: str
    duration: float
    transcript: str
    sample_rate: int
    created_at: datetime


class ClipUpdateTranscript(BaseModel):
    transcript: str


# --- TTS ---

class TTSRequest(BaseModel):
    voice_id: str
    clip_id: str | None = None
    text: str
    instruct_text: str | None = None  # Annotated text with inline expression instructions

    # Model generation parameters
    temperature: float = 0.9
    top_k: int = 50
    top_p: float = 1.0
    repetition_penalty: float = 1.05
    speed: float = 1.0

    # Audio post-processing
    bass_gain: float = 0.0       # dB, range -20 to +20
    treble_gain: float = 0.0     # dB, range -20 to +20
    normalize: bool = False      # loudness normalization


class TTSResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    voice_id: str
    clip_id: str
    text: str
    audio_url: str
    duration: float
    created_at: datetime


# --- Health ---

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str | None = None
