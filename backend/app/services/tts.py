import io
import logging
from pathlib import Path

import numpy as np
import soundfile as sf

from app.config import AUDIO_SAMPLE_RATE

logger = logging.getLogger(__name__)

# Global model reference, set during app startup
_model = None
_model_name: str | None = None


def load_tts_model(model_name: str):
    """Load the TTS model. Called once during app startup."""
    global _model, _model_name
    from mlx_audio.tts.utils import load_model

    logger.info(f"Loading TTS model: {model_name}")
    _model = load_model(model_name)
    _model_name = model_name
    logger.info("TTS model loaded successfully")


def is_model_loaded() -> bool:
    return _model is not None


def get_model_name() -> str | None:
    return _model_name


def generate_speech(
    text: str,
    ref_audio_path: str,
    ref_text: str,
    *,
    temperature: float = 0.9,
    top_k: int = 50,
    top_p: float = 1.0,
    repetition_penalty: float = 1.05,
    speed: float = 1.0,
) -> tuple[bytes, float]:
    """
    Generate speech audio using voice cloning.

    Returns (wav_bytes, duration_seconds).
    """
    if _model is None:
        raise RuntimeError("TTS model not loaded")

    results = list(_model.generate(
        text=text,
        ref_audio=ref_audio_path,
        ref_text=ref_text,
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
        speed=speed,
    ))

    audio_array = results[0].audio
    if isinstance(audio_array, np.ndarray) and audio_array.ndim > 1:
        audio_array = audio_array.squeeze()

    # Convert numpy array to WAV bytes
    buf = io.BytesIO()
    sf.write(buf, audio_array, AUDIO_SAMPLE_RATE, format="WAV", subtype="PCM_16")
    wav_bytes = buf.getvalue()

    duration = len(audio_array) / AUDIO_SAMPLE_RATE
    return wav_bytes, duration
