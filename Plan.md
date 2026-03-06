# Imiteitor - Plano de Desenvolvimento

App de Text-to-Speech com clonagem de voz usando Qwen3 TTS via MLX Audio para macOS.

---

## 1. Visão Geral

O Imiteitor permite ao usuário:
1. Criar e gerenciar **vozes** (com nome e trechos de áudio de referência)
2. Gravar áudio pelo navegador ou fazer upload de arquivo
3. Gerar áudio a partir de texto usando uma voz salva (voice cloning)

---

## 2. Stack Tecnológica

| Camada       | Tecnologia                          | Justificativa                                         |
|--------------|-------------------------------------|-------------------------------------------------------|
| TTS Engine   | `mlx-audio` + Qwen3-TTS Base       | Roda nativamente no Apple Silicon, suporta voice cloning |
| Backend      | Python 3.11+ / FastAPI              | Integração direta com mlx-audio (Python nativo)       |
| Banco de dados | SQLite via SQLAlchemy             | Leve, sem servidor, suficiente para uso local         |
| Frontend     | React + Vite + TypeScript           | Dev experience rápida, hot reload                     |
| Audio Recording | MediaRecorder API (browser)      | Gravação nativa no navegador, sem plugins             |
| Audio Processing | ffmpeg + pydub                  | Conversão e validação de áudio                        |
| Gerenciamento | uv (Python) + pnpm (Node)         | Package managers modernos e rápidos                   |

### Modelo TTS

- **Modelo principal:** `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16`
  - Suporta voice cloning via `ref_audio` + `ref_text`
  - Mínimo 3s de áudio de referência (ótimo: 5-10s)
  - Suporta streaming
  - ~6-8 GB RAM
- **Modelo leve (alternativa):** `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16`
  - ~3-4 GB RAM, mais rápido, qualidade ligeiramente inferior

---

## 3. Estrutura do Projeto

```
imiteitor/
├── backend/
│   ├── pyproject.toml              # Dependências Python (uv)
│   ├── alembic/                    # Migrations do banco
│   │   └── versions/
│   ├── alembic.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app + CORS + lifespan
│   │   ├── config.py               # Configurações (paths, modelo, etc.)
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   ├── models.py               # ORM models (Voice, VoiceClip)
│   │   ├── schemas.py              # Pydantic schemas (request/response)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── voices.py           # CRUD de vozes
│   │   │   ├── clips.py            # Upload/gravação de clips
│   │   │   └── tts.py              # Geração de áudio
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── audio.py            # Processamento de áudio (ffmpeg, validação)
│   │   │   └── tts.py              # Wrapper do mlx-audio
│   │   └── utils.py                # Helpers gerais
│   ├── data/
│   │   ├── voices/                 # Clips de áudio organizados por voice_id
│   │   ├── generated/              # Áudios TTS gerados
│   │   └── imiteitor.db            # SQLite database
│   └── tests/
│       ├── test_voices.py
│       ├── test_clips.py
│       └── test_tts.py
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── client.ts           # API client (fetch wrapper)
│       ├── components/
│       │   ├── Layout.tsx           # Shell da app (sidebar + content)
│       │   ├── VoiceList.tsx        # Lista de vozes
│       │   ├── VoiceCard.tsx        # Card individual de voz
│       │   ├── VoiceForm.tsx        # Form de criar/editar voz
│       │   ├── AudioRecorder.tsx    # Componente de gravação
│       │   ├── AudioUploader.tsx    # Upload de arquivo
│       │   ├── ClipPlayer.tsx       # Player de clip de áudio
│       │   ├── TTSGenerator.tsx     # Interface de geração TTS
│       │   └── AudioPlayer.tsx      # Player do áudio gerado
│       ├── pages/
│       │   ├── VoicesPage.tsx       # Listagem de vozes
│       │   ├── VoiceDetailPage.tsx  # Detalhes + clips de uma voz
│       │   └── GeneratePage.tsx     # Página de geração TTS
│       ├── hooks/
│       │   ├── useAudioRecorder.ts  # Hook para MediaRecorder API
│       │   └── useApi.ts           # Hook para chamadas API
│       └── styles/
│           └── globals.css          # Tailwind + estilos globais
├── Plan.md
└── README.md
```

---

## 4. Modelo de Dados

### Voice

| Campo       | Tipo         | Descrição                     |
|-------------|--------------|-------------------------------|
| id          | UUID (PK)    | Identificador único           |
| name        | VARCHAR(100) | Nome/identificador da voz     |
| description | TEXT (null)   | Descrição opcional            |
| created_at  | DATETIME     | Data de criação               |
| updated_at  | DATETIME     | Última atualização            |

### VoiceClip

| Campo       | Tipo         | Descrição                                  |
|-------------|--------------|---------------------------------------------|
| id          | UUID (PK)    | Identificador único                         |
| voice_id    | UUID (FK)    | Referência à voz                            |
| filename    | VARCHAR(255) | Nome do arquivo em disco                    |
| duration    | FLOAT        | Duração em segundos                         |
| transcript  | TEXT         | Transcrição do áudio (necessário para TTS)  |
| sample_rate | INT          | Sample rate (sempre 24000 após processamento)|
| created_at  | DATETIME     | Data de criação                             |

### GeneratedAudio (opcional, para histórico)

| Campo       | Tipo         | Descrição                     |
|-------------|--------------|-------------------------------|
| id          | UUID (PK)    | Identificador único           |
| voice_id    | UUID (FK)    | Voz usada                     |
| clip_id     | UUID (FK)    | Clip de referência usado      |
| text        | TEXT         | Texto que foi sintetizado     |
| filename    | VARCHAR(255) | Arquivo de áudio gerado       |
| duration    | FLOAT        | Duração do áudio gerado       |
| created_at  | DATETIME     | Data de criação               |

---

## 5. API Endpoints

### Vozes

| Método | Rota                        | Descrição                    | Body/Params                    |
|--------|-----------------------------|------------------------------|--------------------------------|
| GET    | `/api/voices`               | Listar todas as vozes        | —                              |
| POST   | `/api/voices`               | Criar nova voz               | `{ name, description? }`      |
| GET    | `/api/voices/{id}`          | Detalhes de uma voz          | —                              |
| PUT    | `/api/voices/{id}`          | Atualizar voz                | `{ name?, description? }`     |
| DELETE | `/api/voices/{id}`          | Excluir voz e seus clips     | —                              |

### Clips de Áudio

| Método | Rota                                   | Descrição                        | Body/Params                         |
|--------|----------------------------------------|----------------------------------|-------------------------------------|
| GET    | `/api/voices/{id}/clips`               | Listar clips de uma voz          | —                                   |
| POST   | `/api/voices/{id}/clips`               | Adicionar clip (upload)          | `multipart: file + transcript`      |
| POST   | `/api/voices/{id}/clips/record`        | Adicionar clip (gravação)        | `multipart: audio_blob + transcript`|
| GET    | `/api/voices/{id}/clips/{clip_id}`     | Detalhes de um clip              | —                                   |
| GET    | `/api/voices/{id}/clips/{clip_id}/audio` | Stream do arquivo de áudio     | —                                   |
| PUT    | `/api/voices/{id}/clips/{clip_id}`     | Atualizar transcrição do clip    | `{ transcript }`                    |
| DELETE | `/api/voices/{id}/clips/{clip_id}`     | Excluir clip                     | —                                   |

### Geração TTS

| Método | Rota                   | Descrição                                   | Body                                              |
|--------|------------------------|---------------------------------------------|----------------------------------------------------|
| POST   | `/api/tts/generate`    | Gerar áudio a partir de texto               | `{ voice_id, clip_id?, text }`                     |
| GET    | `/api/tts/stream`      | Gerar áudio com streaming (SSE/WebSocket)   | `voice_id, clip_id?, text` (query params)          |
| GET    | `/api/tts/history`     | Listar áudios gerados                       | `?voice_id=` (filtro opcional)                     |
| GET    | `/api/tts/{id}/audio`  | Download do áudio gerado                    | —                                                  |
| DELETE | `/api/tts/{id}`        | Excluir áudio gerado                        | —                                                  |

### Sistema

| Método | Rota               | Descrição                          |
|--------|--------------------|------------------------------------|
| GET    | `/api/health`      | Health check + status do modelo    |
| GET    | `/api/models`      | Modelos disponíveis e carregados   |

---

## 6. Processamento de Áudio

### Pipeline de Ingestão (upload/gravação → clip salvo)

```
Áudio de entrada (qualquer formato)
    │
    ▼
[1] Decodificar com ffmpeg/pydub
    │
    ▼
[2] Validar duração (10s ≤ duração ≤ 30s)
    │  → Rejeitar se fora do range
    ▼
[3] Converter para formato de referência:
    │  - WAV, 24000 Hz, mono, 16-bit signed int
    │  - Aplicar filtros: highpass 80Hz, lowpass 8kHz
    │  - Denoise leve (afftdn)
    │  - Compressão leve
    ▼
[4] Salvar em data/voices/{voice_id}/{clip_id}.wav
    │
    ▼
[5] Registrar no banco (duration, sample_rate, transcript)
```

### Comando ffmpeg de processamento

```bash
ffmpeg -y -hide_banner -i input.wav \
  -af "aformat=channel_layouts=mono,aresample=24000:resampler=soxr,\
highpass=f=80,lowpass=f=8000,\
afftdn=nf=-23,\
acompressor=threshold=-21dB:ratio=2.5:attack=4:release=60:makeup=2" \
  -ar 24000 -sample_fmt s16 output.wav
```

### Gravação no Browser

- Usar `MediaRecorder` API com `audio/webm;codecs=opus` (melhor suporte)
- Enviar o blob como `multipart/form-data`
- Backend converte webm → wav no pipeline acima
- Frontend mostra timer e waveform em tempo real
- Validação de duração no frontend (min 10s, max 30s)

---

## 7. Serviço TTS (Backend)

### Inicialização

```python
# Carregar modelo uma vez no startup da aplicação (lifespan)
from mlx_audio.tts.utils import load_model

model = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16")
```

### Geração de Áudio

```python
async def generate_speech(text: str, ref_audio_path: str, ref_text: str) -> bytes:
    """Gera áudio usando voice cloning do Qwen3-TTS."""
    results = list(model.generate(
        text=text,
        ref_audio=ref_audio_path,
        ref_text=ref_text,
    ))
    # results[0].audio é um numpy array
    audio_array = results[0].audio
    # Converter para WAV bytes
    return numpy_to_wav(audio_array, sample_rate=24000)
```

### Geração com Streaming

```python
async def generate_speech_stream(text: str, ref_audio_path: str, ref_text: str):
    """Gera áudio em streaming."""
    for chunk in model.generate(
        text=text,
        ref_audio=ref_audio_path,
        ref_text=ref_text,
        stream=True,
        streaming_interval=0.5,
    ):
        yield numpy_to_wav_chunk(chunk.audio, sample_rate=24000)
```

### Lógica de Seleção de Clip

Quando o usuário não especificar um `clip_id`:
1. Selecionar o primeiro clip da voz (ou o mais longo, para melhor qualidade)
2. No futuro: permitir concatenar múltiplos clips para melhor representação da voz

---

## 8. Frontend - Telas e Fluxos

### 8.1 Tela Principal - Lista de Vozes (`/`)

```
┌─────────────────────────────────────────────┐
│  🎙️ Imiteitor                               │
├─────────────────────────────────────────────┤
│                                             │
│  [+ Nova Voz]                               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 👤 Voz do João          3 clips     │    │
│  │ Criada em 05/03/2026    [Usar] [✏️]  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ 👤 Narrador              1 clip     │    │
│  │ Criada em 04/03/2026    [Usar] [✏️]  │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

- Lista de vozes com nome, número de clips, data
- Botão "Usar" leva à tela de geração com a voz pré-selecionada
- Botão de editar leva ao detalhe da voz

### 8.2 Criar/Editar Voz (`/voices/new` e `/voices/{id}`)

```
┌─────────────────────────────────────────────┐
│  ← Voltar     Nova Voz                      │
├─────────────────────────────────────────────┤
│                                             │
│  Nome: [________________________]           │
│  Descrição: [___________________]           │
│                                             │
│  ─── Clips de Áudio ───                    │
│                                             │
│  ┌─ Clip 1 ────────────────────────┐       │
│  │ ▶ ════════════════ 00:15        │       │
│  │ Transcrição: [______________]    │       │
│  │                        [🗑 Excluir]│       │
│  └──────────────────────────────────┘       │
│                                             │
│  [🎙️ Gravar Novo Clip]  [📁 Upload Arquivo] │
│                                             │
│  ─── Gravando... ───                       │
│  │ 🔴 ════════════ 00:12 / 00:30   │       │
│  │ [⏹ Parar]                        │       │
│                                             │
│  [Salvar Voz]                               │
└─────────────────────────────────────────────┘
```

- Campo de nome e descrição
- Lista de clips existentes com player e transcrição editável
- Botão gravar: abre recorder inline com timer (10s mín, 30s máx)
- Botão upload: file picker (aceita .wav, .mp3, .m4a, .ogg, .webm)
- Após gravar/upload: campo de transcrição obrigatório
- Validação: pelo menos 1 clip necessário para salvar

### 8.3 Tela de Geração TTS (`/generate`)

```
┌─────────────────────────────────────────────┐
│  ← Voltar     Gerar Áudio                   │
├─────────────────────────────────────────────┤
│                                             │
│  Voz: [▼ Selecionar voz...    ]             │
│                                             │
│  Clip de referência: [▼ Auto (melhor clip)] │
│  ▶ Preview do clip selecionado              │
│                                             │
│  Texto para sintetizar:                     │
│  ┌──────────────────────────────────┐       │
│  │                                  │       │
│  │                                  │       │
│  │                                  │       │
│  └──────────────────────────────────┘       │
│  Caracteres: 0 / 5000                       │
│                                             │
│  [🔊 Gerar Áudio]                           │
│                                             │
│  ─── Resultado ───                          │
│  ▶ ═══════════════════════ 00:45            │
│  [⬇ Download WAV]  [⬇ Download MP3]         │
│                                             │
│  ─── Histórico ───                          │
│  │ "Olá, tudo bem?" - 00:03 - 10:30am     │
│  │ "Bem vindos ao..." - 00:15 - 10:25am   │
│                                             │
└─────────────────────────────────────────────┘
```

- Dropdown de vozes (só vozes com pelo menos 1 clip)
- Dropdown de clip de referência (ou auto-selecionar o melhor)
- Preview do clip de referência selecionado
- Textarea para o texto
- Botão gerar com loading/progress
- Player do resultado com download
- Histórico de gerações recentes

---

## 9. Fluxos Detalhados

### Fluxo 1: Criar Voz com Gravação

1. Usuário clica "Nova Voz"
2. Preenche nome e descrição
3. Clica "Gravar Novo Clip"
4. Browser pede permissão de microfone
5. Gravação começa, timer aparece
6. Timer mostra mínimo (10s) e máximo (30s)
   - Antes de 10s: botão parar desabilitado, mensagem "Grave pelo menos 10 segundos"
   - Aos 30s: gravação para automaticamente
7. Após parar, preview do áudio aparece
8. Usuário digita a transcrição exata do que falou
9. Usuário pode gravar mais clips ou salvar
10. Ao salvar: backend processa o áudio (converte, valida, salva)

### Fluxo 2: Criar Voz com Upload

1. Usuário clica "Upload Arquivo"
2. File picker abre (formatos: .wav, .mp3, .m4a, .ogg, .webm, .flac)
3. Frontend faz validação preliminar de duração (se possível via Web Audio API)
4. Arquivo é enviado ao backend
5. Backend processa: decodifica → valida duração → converte → salva
6. Se duração inválida: retorna erro com a duração detectada
7. Usuário digita a transcrição
8. Clip aparece na lista

### Fluxo 3: Gerar Áudio (TTS)

1. Usuário vai para "Gerar Áudio"
2. Seleciona uma voz no dropdown
3. (Opcional) Seleciona um clip específico de referência
4. Digita o texto que quer sintetizar
5. Clica "Gerar Áudio"
6. Backend:
   a. Carrega o clip de referência selecionado (ou o melhor da voz)
   b. Chama `model.generate(text=..., ref_audio=..., ref_text=...)`
   c. Converte resultado para WAV
   d. Salva em `data/generated/`
   e. Registra no banco (histórico)
   f. Retorna o áudio
7. Frontend toca o áudio automaticamente
8. Usuário pode baixar em WAV ou MP3

---

## 10. Dependências

### Backend (Python)

```toml
[project]
name = "imiteitor-backend"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "sqlalchemy>=2.0",
    "alembic>=1.14",
    "mlx-audio[tts]",
    "pydub>=0.25",
    "python-multipart>=0.0.18",
    "aiofiles>=24.1",
    "numpy>=1.26",
    "soundfile>=0.12",
]
```

### Frontend (Node)

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4",
    "vite": "^6",
    "typescript": "^5.7",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```

### Sistema

- macOS com Apple Silicon (M1/M2/M3/M4)
- Python 3.11+
- Node.js 20+
- ffmpeg: `brew install ffmpeg`
- uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- pnpm: `npm install -g pnpm`

---

## 11. Configuração e Ambiente

### Configurações (backend/app/config.py)

```python
DATA_DIR = "data"                    # Diretório raiz dos dados
VOICES_DIR = "data/voices"           # Clips de áudio das vozes
GENERATED_DIR = "data/generated"     # Áudios gerados
DB_URL = "sqlite:///data/imiteitor.db"

# Modelo TTS
TTS_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
TTS_MODEL_LITE = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16"

# Audio processing
AUDIO_SAMPLE_RATE = 24000
AUDIO_MIN_DURATION = 10  # segundos
AUDIO_MAX_DURATION = 30  # segundos
AUDIO_FORMAT = "wav"

# Server
HOST = "0.0.0.0"
PORT = 8000
FRONTEND_URL = "http://localhost:5173"  # Dev mode
```

---

## 12. Ordem de Implementação

### Fase 1: Fundação (Backend Core)

1. Inicializar projeto Python com uv + pyproject.toml
2. Configurar FastAPI app com CORS
3. Configurar SQLAlchemy + SQLite + Alembic
4. Criar models (Voice, VoiceClip)
5. Criar migrations iniciais
6. Implementar CRUD de vozes (router + schemas)
7. Implementar upload de clips com processamento de áudio
8. Implementar endpoint de servir áudio (stream file)
9. Testes dos endpoints

### Fase 2: Motor TTS

10. Integrar mlx-audio: carregar modelo no startup
11. Implementar serviço TTS (generate com ref_audio)
12. Implementar endpoint POST /api/tts/generate
13. Implementar salvamento de áudio gerado
14. Implementar modelo GeneratedAudio + histórico
15. Testar geração end-to-end

### Fase 3: Frontend Base

16. Inicializar projeto React + Vite + TypeScript + Tailwind
17. Configurar API client (fetch wrapper)
18. Implementar Layout (sidebar/header + content)
19. Implementar VoicesPage (lista de vozes)
20. Implementar VoiceForm (criar/editar voz)

### Fase 4: Áudio no Frontend

21. Implementar AudioUploader (upload de arquivo)
22. Implementar AudioRecorder (gravação no browser)
    - MediaRecorder API
    - Timer com validação min/max
    - Waveform visualization (opcional)
23. Implementar ClipPlayer (reproduzir clips salvos)
24. Integrar upload/gravação com o form de voz

### Fase 5: Geração TTS no Frontend

25. Implementar GeneratePage
26. Implementar seleção de voz + clip
27. Implementar textarea com contador
28. Implementar chamada de geração + loading state
29. Implementar player do resultado
30. Implementar download WAV/MP3
31. Implementar histórico de gerações

### Fase 6: Polish

32. Tratamento de erros consistente (toasts/notificações)
33. Loading states e skeleton screens
34. Confirmação ao excluir voz/clip
35. Responsividade básica
36. Build de produção: servir frontend pelo FastAPI

---

## 13. Decisões Técnicas

### Por que Qwen3-TTS Base (e não CustomVoice/VoiceDesign)?

O modelo **Base** é o único que suporta voice cloning via `ref_audio`. Os outros modelos usam vozes pré-definidas ou geram vozes via descrição textual, que não atendem o requisito de "usar a voz do usuário".

### Por que exigir transcrição do clip?

O modelo Qwen3-TTS Base requer `ref_text` (transcrição do áudio de referência) junto com `ref_audio`. Sem a transcrição, a qualidade da clonagem cai significativamente. A transcrição é o que o modelo "fala" no áudio de referência.

### Por que 10-30 segundos?

- **Mínimo 10s:** O modelo funciona com 3s, mas a qualidade de clonagem melhora substancialmente com mais áudio. 10s garante qualidade mínima aceitável.
- **Máximo 30s:** Clips muito longos aumentam o tempo de processamento sem ganho proporcional de qualidade. 30s é um bom limite prático.

### Por que WAV 24kHz mono?

É o formato nativo do Qwen3-TTS. Converter na ingestão evita processamento repetido a cada geração.

### Por que SQLite?

App local, single-user. SQLite não precisa de servidor, é embutido, e performa perfeitamente para esse caso de uso. Se no futuro precisar de multi-user, migrar para PostgreSQL é trivial com SQLAlchemy.

### Streaming ou não?

A primeira implementação será **sem streaming** (mais simples). Streaming pode ser adicionado depois via Server-Sent Events (SSE) para melhor UX em textos longos.

---

## 14. Formato de Resposta da API

### Exemplo: POST /api/tts/generate

**Request:**
```json
{
  "voice_id": "uuid-da-voz",
  "clip_id": "uuid-do-clip-ou-null",
  "text": "Olá, este é um teste de geração de voz."
}
```

**Response:**
```json
{
  "id": "uuid-do-audio-gerado",
  "voice_id": "uuid-da-voz",
  "clip_id": "uuid-do-clip-usado",
  "text": "Olá, este é um teste de geração de voz.",
  "audio_url": "/api/tts/uuid-do-audio-gerado/audio",
  "duration": 3.5,
  "created_at": "2026-03-05T15:30:00Z"
}
```

---

## 15. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Modelo pesado (6-8 GB RAM) | Lentidão em Macs com pouca RAM | Oferecer modelo 0.6B como alternativa |
| Primeira carga do modelo lenta | UX ruim | Pré-carregar no startup, mostrar status |
| Qualidade de clonagem variável | Frustração do usuário | Guia de boas práticas na UI ("fale claramente, sem ruído") |
| ffmpeg não instalado | Erro ao processar áudio | Verificar no startup, mensagem clara |
| Áudio gravado com ruído | Clonagem ruim | Aplicar filtros no pipeline de processamento |
| Transcrição incorreta | Qualidade baixa | No futuro: usar STT para auto-transcrever |
