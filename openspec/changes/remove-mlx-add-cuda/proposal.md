## Why

The application is currently locked to macOS with Apple Silicon due to its dependency on MLX (Apple's ML framework) and MLX Metal for GPU acceleration. Replacing MLX with CUDA-based inference via PyTorch opens the application to Linux and Windows users with NVIDIA GPUs, which represents the vast majority of ML-capable hardware.

## What Changes

- **BREAKING**: Remove all MLX dependencies (`mlx`, `mlx-metal`, `mlx-audio`, `mlx-whisper`, `mlx-lm`)
- **BREAKING**: Replace MLX-based TTS service with PyTorch/CUDA-based implementation using `transformers` and Qwen3-TTS
- **BREAKING**: Replace `mlx-whisper` STT with `openai-whisper` or `faster-whisper` (CUDA-accelerated)
- Replace MLX-community model references (`mlx-community/Qwen3-TTS-*`) with HuggingFace model references
- Update `pyproject.toml` dependencies to use PyTorch + CUDA ecosystem
- Update model loading, generation, and speaker embedding extraction to use PyTorch APIs
- Preserve all existing API contracts, audio processing pipeline, and frontend behavior

## Capabilities

### New Capabilities
- `cuda-tts`: CUDA-accelerated TTS generation using PyTorch and Qwen3-TTS models from HuggingFace, replacing MLX-based inference
- `cuda-stt`: CUDA-accelerated speech-to-text using Whisper via PyTorch, replacing mlx-whisper

### Modified Capabilities

## Impact

- **Backend services**: Complete rewrite of `services/tts.py` and `services/stt.py`
- **Configuration**: `config.py` model paths change from `mlx-community/*` to HuggingFace model IDs
- **Startup**: `main.py` model loading logic updated for PyTorch model initialization
- **Dependencies**: `pyproject.toml` and `uv.lock` fully replaced for ML stack (FastAPI/SQLAlchemy/ffmpeg unchanged)
- **Platform**: No longer macOS-only; requires NVIDIA GPU with CUDA support
- **API contracts**: Unchanged - all endpoints, request/response schemas remain identical
- **Frontend**: No changes required
