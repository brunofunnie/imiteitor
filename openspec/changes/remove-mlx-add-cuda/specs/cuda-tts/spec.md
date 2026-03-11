## ADDED Requirements

### Requirement: CUDA TTS model loading
The system SHALL load Qwen3-TTS models from HuggingFace using `transformers` with CUDA acceleration. The system SHALL support loading a Base model and an optional Instruct (CustomVoice) model. Model loading SHALL occur in a background thread to keep the API responsive.

#### Scenario: Successful model loading on startup
- **WHEN** the application starts with a CUDA-capable GPU available
- **THEN** the Base TTS model is loaded onto CUDA in a background thread and `is_model_loaded()` returns `True` after loading completes

#### Scenario: Instruct model loading with 8-bit quantization
- **WHEN** the application starts and the instruct model is configured
- **THEN** the Instruct model is loaded with 8-bit quantization via `bitsandbytes` to reduce VRAM usage

#### Scenario: Model loading failure
- **WHEN** model loading fails (no GPU, OOM, network error)
- **THEN** the error is logged and the application continues running without TTS capability

### Requirement: CUDA TTS speech generation via ICL
The system SHALL generate speech audio using in-context learning (ICL) with a reference audio file and reference transcript. The generation SHALL use the Base Qwen3-TTS model on CUDA. Output SHALL be WAV format at 24kHz sample rate, 16-bit PCM.

#### Scenario: Standard voice cloning generation
- **WHEN** `generate_speech()` is called with text, ref_audio_path, and ref_text
- **THEN** the system generates audio using the Base model's ICL pipeline and returns `(wav_bytes, duration_seconds)`

#### Scenario: Generation with custom parameters
- **WHEN** `generate_speech()` is called with temperature, top_k, top_p, repetition_penalty, and speed parameters
- **THEN** those parameters are passed to the model's generate method and affect output accordingly

#### Scenario: Model not loaded
- **WHEN** `generate_speech()` is called before the model has finished loading
- **THEN** a `RuntimeError` is raised with message "TTS model not loaded"

### Requirement: CUDA TTS instruct generation with voice identity
The system SHALL support emotion/style-controlled generation using the Instruct model while preserving voice identity from a reference audio. Speaker embeddings SHALL be extracted from the Base model and injected into the Instruct model's generation pipeline.

#### Scenario: Instruct generation with voice cloning
- **WHEN** `generate_speech()` is called with `instruct_text` and a reference audio path
- **THEN** the system extracts a speaker embedding from the Base model, injects it into the Instruct model, and generates speech with the specified emotion/style

#### Scenario: Instruct model not available
- **WHEN** `generate_speech()` is called with `instruct_text` but the Instruct model failed to load
- **THEN** the system falls back to standard ICL generation using the Base model

### Requirement: CUDA TTS model configuration
The system SHALL define model identifiers in `config.py` pointing to HuggingFace model repositories instead of MLX-community models.

#### Scenario: Configuration defines HuggingFace models
- **WHEN** the configuration is loaded
- **THEN** `TTS_MODEL` references a HuggingFace Qwen3-TTS Base model, `TTS_MODEL_LITE` references the 0.6B variant, and `TTS_MODEL_INSTRUCT` references the CustomVoice variant
