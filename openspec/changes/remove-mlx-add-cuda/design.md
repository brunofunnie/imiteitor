## Context

Imiteitor is a local TTS voice cloning app currently built exclusively for macOS/Apple Silicon using MLX as the ML runtime. The ML stack consists of:
- `mlx-audio[tts]` (custom fork) for Qwen3-TTS model loading and generation
- `mlx-whisper` for Whisper-based transcription
- Models from `mlx-community/*` (MLX-quantized variants)

The backend is FastAPI with two ML services (`tts.py`, `stt.py`) that directly call MLX APIs. All other components (audio processing, database, API, frontend) are platform-agnostic.

## Goals / Non-Goals

**Goals:**
- Replace MLX inference with PyTorch + CUDA for TTS and STT
- Maintain identical API contracts (no frontend changes)
- Preserve both generation paths: standard ICL and instruct/emotion
- Keep background model loading pattern

**Non-Goals:**
- CPU fallback support (CUDA required for now)
- Streaming/chunked audio generation
- Changing the audio processing pipeline (ffmpeg stays)
- Supporting multiple GPU backends (ROCm, etc.)
- Changing the frontend or database schema

## Decisions

### 1. TTS: Use `qwen-tts` package (official Qwen3-TTS Python SDK)

**Rationale:** The `qwen-tts` package provides `Qwen3TTSModel.from_pretrained()` with built-in CUDA support, bf16 inference, and high-level APIs for voice cloning and custom voice generation. This is the official SDK maintained by the Qwen team.

**Alternative considered:** Raw `transformers` with `AutoModelForCausalLM`. Rejected: would require reimplementing audio codec decoding, tokenization, and generation logic that `qwen-tts` already provides.

**Model mapping:**
- Base: `Qwen/Qwen3-TTS-12Hz-1.7B-Base` (bf16 on CUDA) — voice cloning via `generate_voice_clone()`
- Lite: `Qwen/Qwen3-TTS-12Hz-0.6B-Base` (bf16 on CUDA)
- Instruct: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` (bf16 on CUDA) — emotion/style via `generate_custom_voice()`

**API mapping:**
- `load_model()` → `Qwen3TTSModel.from_pretrained(model_id, device_map="cuda:0", dtype=torch.bfloat16)`
- `model.generate(text, ref_audio, ref_text)` → `model.generate_voice_clone(text, language, ref_audio, ref_text)`
- Instruct: `model.generate_custom_voice(text, language, speaker, instruct=instruct_text)`

### 2. STT: Use `faster-whisper` with CTranslate2

**Rationale:** `faster-whisper` provides CUDA-accelerated Whisper inference with lower VRAM usage than the original `openai-whisper`. Drop-in API: `model.transcribe(audio_path)`.

**Alternative considered:** `openai-whisper` (official). Rejected: higher VRAM, slower inference, heavier PyTorch dependency overlap but less optimized.

**Model:** `large-v3-turbo` via CTranslate2 format (auto-downloaded).

### 3. Instruct mode: CustomVoice with preset speakers (simplified)

The MLX implementation used a monkey-patching hack to inject Base model speaker embeddings into the CustomVoice model. With the `qwen-tts` SDK, the CustomVoice model uses predefined speakers (e.g., "Chelsie") with instruct text for emotion/style control. Voice identity from ref_audio is NOT preserved in instruct mode — this is a known simplification.

For combined voice identity + instruct, future work could explore the `create_voice_clone_prompt()` API or the VoiceDesign model workflow.

### 4. Dependencies via `pyproject.toml` with CUDA PyTorch

Replace ML dependencies with:
```
qwen-tts (pulls in torch, transformers, etc.)
torch (with CUDA index via uv)
faster-whisper
soundfile, numpy (unchanged)
```

Use `uv` with explicit PyTorch CUDA index for GPU-accelerated torch wheels.

## Risks / Trade-offs

- **[VRAM usage]** Two Qwen3-TTS models + Whisper may exceed 8GB VRAM on smaller GPUs → Mitigation: Load instruct model lazily only when needed
- **[Instruct voice identity]** CustomVoice model uses preset speakers, not cloned voice identity → Mitigation: Acceptable for emotion control; standard ICL path preserves voice identity perfectly
- **[Platform lock-in shift]** Moving from macOS-only to NVIDIA-only → Mitigation: Acceptable trade-off for broader reach; CPU fallback can be added later
- **[Breaking existing users]** Anyone currently using the macOS version loses support → Mitigation: This is an intentional platform pivot, not a regression
