import subprocess
import tempfile
from pathlib import Path

from app.config import AUDIO_SAMPLE_RATE, AUDIO_MIN_DURATION, AUDIO_MAX_DURATION


class AudioValidationError(Exception):
    pass


def get_audio_duration(file_path: Path) -> float:
    """Get duration of an audio file in seconds using ffprobe/ffmpeg."""
    # Try format and stream duration metadata first
    for entry in ("format=duration", "stream=duration"):
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", entry,
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path),
            ],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise AudioValidationError(f"Cannot read audio file: {result.stderr.strip()}")
        for line in result.stdout.strip().splitlines():
            try:
                return float(line)
            except ValueError:
                continue

    # Fallback: decode to null and read the time from stderr (works for all formats)
    result = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-i", str(file_path),
            "-f", "null", "-",
        ],
        capture_output=True, text=True,
    )
    # Parse "time=HH:MM:SS.ss" from ffmpeg progress output
    import re
    matches = re.findall(r"time=(\d+):(\d+):(\d+\.\d+)", result.stderr)
    if matches:
        h, m, s = matches[-1]
        return int(h) * 3600 + int(m) * 60 + float(s)

    raise AudioValidationError("Cannot determine audio duration")


def process_audio_clip(input_path: Path, output_path: Path) -> float:
    """
    Process an audio file into the reference format for Qwen3-TTS:
    WAV, 24kHz, mono, 16-bit, with noise filtering.

    Returns the duration in seconds.
    """
    # First check duration of the raw input
    duration = get_audio_duration(input_path)
    if duration < AUDIO_MIN_DURATION:
        raise AudioValidationError(
            f"Audio too short: {duration:.1f}s (minimum {AUDIO_MIN_DURATION}s)"
        )
    if duration > AUDIO_MAX_DURATION:
        raise AudioValidationError(
            f"Audio too long: {duration:.1f}s (maximum {AUDIO_MAX_DURATION}s)"
        )

    # Convert to reference format
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(input_path),
            "-af", (
                "aformat=channel_layouts=mono,"
                f"aresample={AUDIO_SAMPLE_RATE},"
                "highpass=f=80,lowpass=f=8000,"
                "afftdn=nf=-23,"
                "acompressor=threshold=-21dB:ratio=2.5:attack=4:release=60:makeup=2"
            ),
            "-ar", str(AUDIO_SAMPLE_RATE),
            "-sample_fmt", "s16",
            str(output_path),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise AudioValidationError(f"Audio processing failed: {result.stderr.strip()}")

    # Return processed duration
    return get_audio_duration(output_path)


def save_uploaded_audio(content: bytes, suffix: str = ".wav") -> Path:
    """Save uploaded audio bytes to a temporary file."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(content)
    tmp.close()
    return Path(tmp.name)
