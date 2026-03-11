## ADDED Requirements

### Requirement: CUDA STT model loading
The system SHALL use `faster-whisper` with CTranslate2 for CUDA-accelerated speech-to-text. The model SHALL be loaded lazily on first use and cached for subsequent calls.

#### Scenario: STT model initialization
- **WHEN** the application starts and `load_stt_model()` is called
- **THEN** the STT model readiness flag is set and the model will be initialized on first transcription request

#### Scenario: First transcription triggers model load
- **WHEN** `transcribe()` is called for the first time
- **THEN** the `faster-whisper` model (`large-v3-turbo`) is loaded onto CUDA and cached globally

### Requirement: CUDA STT transcription
The system SHALL transcribe audio files to text using `faster-whisper` on CUDA. The API SHALL accept an audio file path and optional language parameter, returning the transcribed text as a string.

#### Scenario: Successful transcription
- **WHEN** `transcribe(audio_path)` is called with a valid audio file
- **THEN** the system returns the transcribed text as a stripped string

#### Scenario: Transcription with language hint
- **WHEN** `transcribe(audio_path, language="es")` is called with a language parameter
- **THEN** the transcription uses the specified language instead of auto-detection

### Requirement: CUDA STT dependencies
The system SHALL use `faster-whisper` instead of `mlx-whisper` for Whisper inference. The `faster-whisper` library SHALL be listed in `pyproject.toml` dependencies.

#### Scenario: Dependency replacement
- **WHEN** the project dependencies are installed
- **THEN** `faster-whisper` is installed and `mlx-whisper` is NOT present in the dependency list
