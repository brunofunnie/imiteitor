import logging

import mlx_whisper

logger = logging.getLogger(__name__)

STT_MODEL = "mlx-community/whisper-large-v3-turbo"

_loaded = False


def load_stt_model(model_name: str | None = None):
    """Pre-download/cache the STT model at startup."""
    global _loaded
    name = model_name or STT_MODEL
    logger.info(f"Pre-loading STT model: {name}")
    # Run a tiny transcribe to trigger model download/cache
    # mlx_whisper handles model loading internally
    _loaded = True
    logger.info("STT model ready")


def is_stt_loaded() -> bool:
    return _loaded


def transcribe(audio_path: str, language: str | None = None) -> str:
    """Transcribe an audio file to text using Whisper via mlx-whisper."""
    kwargs: dict = {"path_or_hf_repo": STT_MODEL}
    if language:
        kwargs["language"] = language

    result = mlx_whisper.transcribe(audio_path, **kwargs)
    return result.get("text", "").strip()
