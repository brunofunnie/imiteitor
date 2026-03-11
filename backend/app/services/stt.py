import logging

logger = logging.getLogger(__name__)

STT_MODEL = "large-v3-turbo"

_model = None
_loaded = False


def load_stt_model(model_name: str | None = None):
    """Pre-download/cache the STT model at startup."""
    global _loaded
    name = model_name or STT_MODEL
    logger.info(f"Pre-loading STT model: {name}")
    _ensure_model(name)
    _loaded = True
    logger.info("STT model ready")


def _ensure_model(model_name: str | None = None):
    """Lazily load the WhisperModel on first use."""
    global _model
    if _model is not None:
        return
    from faster_whisper import WhisperModel

    name = model_name or STT_MODEL
    logger.info(f"Initializing faster-whisper model: {name}")
    _model = WhisperModel(name, device="cuda", compute_type="float16")
    logger.info("faster-whisper model loaded")


def is_stt_loaded() -> bool:
    return _loaded


def transcribe(audio_path: str, language: str | None = None) -> str:
    """Transcribe an audio file to text using faster-whisper on CUDA."""
    _ensure_model()

    kwargs: dict = {}
    if language:
        kwargs["language"] = language

    segments, _info = _model.transcribe(audio_path, **kwargs)
    text = " ".join(segment.text.strip() for segment in segments)
    return text.strip()
