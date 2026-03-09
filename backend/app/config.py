from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
VOICES_DIR = DATA_DIR / "voices"
GENERATED_DIR = DATA_DIR / "generated"
DB_PATH = DATA_DIR / "imiteitor.db"
DB_URL = f"sqlite:///{DB_PATH}"

TTS_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
TTS_MODEL_LITE = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16"
TTS_MODEL_INSTRUCT = "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit"

AUDIO_SAMPLE_RATE = 24000
AUDIO_MIN_DURATION = 10  # seconds
AUDIO_MAX_DURATION = 30  # seconds

HOST = "0.0.0.0"
PORT = 8000
FRONTEND_URL = "http://localhost:5173"

# Ensure directories exist
VOICES_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
