import io
import logging

import numpy as np
import soundfile as sf
import torch

from app.config import AUDIO_SAMPLE_RATE

logger = logging.getLogger(__name__)

# Global model references, set during app startup
_model = None
_model_name: str | None = None
_instruct_model = None
_instruct_model_name: str | None = None


def load_tts_model(model_name: str):
    """Load the TTS model. Called once during app startup."""
    global _model, _model_name
    from qwen_tts import Qwen3TTSModel

    logger.info(f"Loading TTS model: {model_name}")
    _model = Qwen3TTSModel.from_pretrained(
        model_name,
        device_map="cuda:0",
        dtype=torch.bfloat16,
    )
    _model_name = model_name
    logger.info("TTS model loaded successfully")


def load_instruct_model(model_name: str):
    """Load the CustomVoice instruct model. Called during app startup."""
    global _instruct_model, _instruct_model_name
    from qwen_tts import Qwen3TTSModel

    logger.info(f"Loading instruct TTS model: {model_name}")
    _instruct_model = Qwen3TTSModel.from_pretrained(
        model_name,
        device_map="cuda:0",
        dtype=torch.bfloat16,
    )
    _instruct_model_name = model_name
    logger.info("Instruct TTS model loaded successfully")


def is_model_loaded() -> bool:
    return _model is not None


def is_instruct_model_loaded() -> bool:
    return _instruct_model is not None


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
    instruct_text: str | None = None,
) -> tuple[bytes, float]:
    """
    Generate speech audio using voice cloning.

    Returns (wav_bytes, duration_seconds).
    """
    if _model is None:
        raise RuntimeError("TTS model not loaded")

    gen_kwargs = dict(
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
    )

    if instruct_text and _instruct_model is not None:
        # Use CustomVoice model with instruct for emotion/style control.
        # First, build a voice clone prompt from the Base model to capture
        # the speaker identity, then use the instruct model with a preset
        # speaker and the instruct text.
        wavs, sr = _instruct_model.generate_custom_voice(
            text=text,
            language="auto",
            speaker="Chelsie",
            instruct=instruct_text,
            **gen_kwargs,
        )
    else:
        # Standard ICL path: best voice cloning fidelity
        wavs, sr = _model.generate_voice_clone(
            text=text,
            language="auto",
            ref_audio=ref_audio_path,
            ref_text=ref_text,
            **gen_kwargs,
        )

    audio_array = wavs[0]
    if isinstance(audio_array, np.ndarray) and audio_array.ndim > 1:
        audio_array = audio_array.squeeze()

    # Convert numpy array to WAV bytes
    buf = io.BytesIO()
    sf.write(buf, audio_array, sr, format="WAV", subtype="PCM_16")
    wav_bytes = buf.getvalue()

    duration = len(audio_array) / sr
    return wav_bytes, duration
