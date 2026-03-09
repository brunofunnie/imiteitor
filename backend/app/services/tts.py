import io
import logging

import numpy as np
import soundfile as sf

from app.config import AUDIO_SAMPLE_RATE

logger = logging.getLogger(__name__)

# Global model references, set during app startup
_model = None
_model_name: str | None = None
_instruct_model = None
_instruct_model_name: str | None = None


def _generate_instruct_with_voice(
    text: str,
    ref_audio_path: str,
    instruct: str,
    *,
    temperature: float = 0.9,
    top_k: int = 50,
    top_p: float = 1.0,
    repetition_penalty: float = 1.05,
    speed: float = 1.0,
) -> list:
    """Generate speech with emotion/style control AND voice identity.

    Uses the Base model's speaker_encoder to extract a voice embedding from
    ref_audio, then injects it into the CustomVoice model's generation pipeline
    which natively supports instruct for emotion/style control.

    Strategy:
    1. Extract speaker embedding using Base model's speaker_encoder
    2. Give the CustomVoice model a fake speaker_encoder that returns it
    3. Patch _prepare_generation_inputs to pass ref_audio so the speaker
       embedding extraction path is triggered, placing it correctly in
       the codec prefix structure
    """
    from mlx_audio.utils import load_audio

    # 1. Extract speaker embedding from ref_audio using the Base model's encoder
    _ref_audio = load_audio(ref_audio_path, sample_rate=_model.sample_rate)
    speaker_embed = _model.extract_speaker_embedding(_ref_audio)

    # 2. Fake speaker encoder that returns our pre-computed embedding
    class _FakeSpeakerEncoder:
        def __call__(self, *args, **kwargs):
            return speaker_embed

    orig_encoder = _instruct_model.speaker_encoder
    _instruct_model.speaker_encoder = _FakeSpeakerEncoder()

    # 3. Patch _prepare_generation_inputs to pass ref_audio, triggering
    #    the speaker embedding path at line 306-307 of the library
    orig_prep = _instruct_model._prepare_generation_inputs

    def prep_with_ref(text=None, language="auto", speaker=None,
                      ref_audio=None, ref_text=None, instruct=None, **kwargs):
        return orig_prep(text, language=language, speaker=speaker,
                         ref_audio=_ref_audio, ref_text=None, instruct=instruct)

    _instruct_model._prepare_generation_inputs = prep_with_ref
    try:
        results = list(_instruct_model._generate_with_instruct(
            text=text,
            speaker=None,
            language="auto",
            instruct=instruct,
            temperature=temperature,
            max_tokens=4096,
            top_k=top_k,
            top_p=top_p,
            repetition_penalty=repetition_penalty,
            verbose=False,
        ))
    finally:
        _instruct_model._prepare_generation_inputs = orig_prep
        _instruct_model.speaker_encoder = orig_encoder

    return results


def load_tts_model(model_name: str):
    """Load the TTS model. Called once during app startup."""
    global _model, _model_name
    from mlx_audio.tts.utils import load_model

    logger.info(f"Loading TTS model: {model_name}")
    _model = load_model(model_name)
    _model_name = model_name
    logger.info("TTS model loaded successfully")


def load_instruct_model(model_name: str):
    """Load the CustomVoice instruct model. Called during app startup."""
    global _instruct_model, _instruct_model_name
    from mlx_audio.tts.utils import load_model

    logger.info(f"Loading instruct TTS model: {model_name}")
    _instruct_model = load_model(model_name)
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

    if instruct_text and _instruct_model is not None:
        # Use the CustomVoice model with instruct support.
        # Extract speaker embedding from ref_audio using the Base model's encoder,
        # then inject it into the CustomVoice model's generation for voice identity.
        results = _generate_instruct_with_voice(
            text=text,
            ref_audio_path=ref_audio_path,
            instruct=instruct_text,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            repetition_penalty=repetition_penalty,
            speed=speed,
        )
    else:
        # Standard ICL path: best voice cloning fidelity
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
