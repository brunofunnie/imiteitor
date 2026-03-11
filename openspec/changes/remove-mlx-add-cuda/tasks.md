## 1. Dependencies

- [x] 1.1 Update `pyproject.toml`: remove `mlx-audio[tts]` and `mlx-whisper`, add `qwen-tts`, `torch`, `faster-whisper`, `soundfile`, `numpy`
- [x] 1.2 Configure PyTorch CUDA index URL in `pyproject.toml` (uv `--extra-index-url` for CUDA wheels)
- [x] 1.3 Run `uv lock` and verify dependency resolution succeeds

## 2. Configuration

- [x] 2.1 Update `config.py`: replace MLX model IDs with HuggingFace model IDs (`Qwen/Qwen3-TTS-12Hz-1.7B-Base`, `Qwen/Qwen3-TTS-12Hz-0.6B-Base`, `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`)
- [x] 2.2 Update `pyproject.toml` project description to remove "MLX" reference

## 3. TTS Service (CUDA)

- [x] 3.1 Rewrite `services/tts.py` `load_tts_model()`: load Base model using `Qwen3TTSModel.from_pretrained` on CUDA
- [x] 3.2 Rewrite `services/tts.py` `load_instruct_model()`: load CustomVoice model using `Qwen3TTSModel.from_pretrained` on CUDA
- [x] 3.3 Rewrite `generate_speech()` standard ICL path: use `model.generate_voice_clone()` with ref_audio and ref_text
- [x] 3.4 Rewrite instruct path: use CustomVoice model's `generate_custom_voice()` with instruct support
- [x] 3.5 Verify audio output: numpy array → WAV conversion at 24kHz 16-bit PCM remains correct
- [x] 3.6 Remove all `mlx_audio` imports from `services/tts.py`

## 4. STT Service (CUDA)

- [x] 4.1 Rewrite `services/stt.py`: replace `mlx_whisper` with `faster_whisper.WhisperModel` using `large-v3-turbo` on CUDA
- [x] 4.2 Implement lazy model loading: initialize `WhisperModel` on first `transcribe()` call, cache globally
- [x] 4.3 Update `transcribe()`: use `faster-whisper` API, concatenate segments into single text string
- [x] 4.4 Remove all `mlx_whisper` imports from `services/stt.py`

## 5. App Startup

- [x] 5.1 Update `main.py` imports if any changed (verify `load_tts_model`, `load_instruct_model`, `load_stt_model` signatures are preserved)
- [x] 5.2 Verify background model loading thread still works correctly with PyTorch CUDA initialization

## 6. Validation

- [ ] 6.1 Start the application and verify all three models load successfully on CUDA
- [ ] 6.2 Test TTS generation via API: standard ICL path with reference audio
- [ ] 6.3 Test TTS generation via API: instruct path with emotion text
- [ ] 6.4 Test STT transcription via API: upload audio and verify transcript
- [ ] 6.5 Verify no MLX references remain in the codebase (`grep -r "mlx"` in backend)
