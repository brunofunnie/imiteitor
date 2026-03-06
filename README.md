# Imiteitor

App de text-to-speech com clonagem de voz usando **Qwen3-TTS** via [MLX Audio](https://github.com/Blaizzy/mlx-audio), rodando localmente no macOS com Apple Silicon.

## Funcionalidades

- **Gerenciamento de vozes** — crie vozes com nome e descrição, adicione clips de referência (10–30 segundos cada)
- **Gravação no navegador** — grave áudio direto pelo microfone com visualização de duração
- **Upload de arquivos** — suporte a WAV, MP3, M4A, OGG, WebM, FLAC, Opus
- **Transcrição automática** — ao gravar ou enviar um clip, o áudio é transcrito automaticamente via Whisper (mlx-whisper) para preencher o campo de referência
- **Geração de áudio (TTS)** — selecione uma voz salva, digite o texto e gere áudio com a voz clonada
- **Opções avançadas de geração** — controle de temperatura, top-k, top-p, penalidade de repetição, velocidade
- **Pós-processamento de áudio** — equalização (graves/agudos) e normalização de volume (EBU R128)
- **Histórico** — todas as gerações ficam salvas com player, download e opção de deletar

## Requisitos

- **macOS** com Apple Silicon (M1/M2/M3/M4)
- **Python** >= 3.11
- **Node.js** >= 18
- **ffmpeg** instalado (`brew install ffmpeg`)
- **uv** (gerenciador de pacotes Python) — [instalar](https://docs.astral.sh/uv/getting-started/installation/)

## Instalação

```bash
git clone <repo-url>
cd imiteitor
make install
```

Isso instala as dependências do backend (`uv sync`) e do frontend (`npm install`).

> **Nota:** Na primeira execução, os modelos TTS (~3.4 GB) e STT (~1.5 GB) serão baixados automaticamente do Hugging Face.

## Uso

### Iniciar em modo de desenvolvimento

```bash
make dev
```

Isso inicia simultaneamente:
- **Backend** (FastAPI) em `http://localhost:8000`
- **Frontend** (Vite) em `http://localhost:5173`

Acesse `http://localhost:5173` no navegador.

### Executar separadamente

```bash
make dev-backend    # só o backend (porta 8000)
make dev-frontend   # só o frontend (porta 5173)
```

### Build para produção

```bash
make build
```

### Limpar artefatos

```bash
make clean
```

Remove `node_modules`, `dist`, `.venv` e o banco de dados SQLite.

## Arquitetura

```
imiteitor/
├── backend/                 # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py          # Entry point, CORS, model loading
│   │   ├── config.py        # Constantes e paths
│   │   ├── models.py        # ORM (Voice, VoiceClip, GeneratedAudio)
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # Engine SQLAlchemy
│   │   ├── routers/         # Endpoints (voices, clips, tts, transcribe)
│   │   └── services/        # TTS, STT, processamento de áudio
│   └── pyproject.toml
├── frontend/                # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/client.ts    # Cliente HTTP tipado
│   │   ├── pages/           # VoicesPage, VoiceDetailPage, GeneratePage
│   │   ├── components/      # AudioRecorder, AudioUploader, ClipPlayer
│   │   └── hooks/           # useAudioRecorder
│   └── package.json
├── Makefile
└── README.md
```

## Modelos utilizados

| Modelo | Uso | Tamanho |
|--------|-----|---------|
| [mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16](https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16) | Geração de voz (TTS) com clonagem | ~3.4 GB |
| [mlx-community/whisper-large-v3-turbo](https://huggingface.co/mlx-community/whisper-large-v3-turbo) | Transcrição automática (STT) | ~1.5 GB |

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite, MLX Audio, mlx-whisper
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Áudio:** ffmpeg (conversão, EQ, normalização)

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/voices` | Listar vozes |
| `POST` | `/api/voices` | Criar voz |
| `GET` | `/api/voices/:id` | Detalhes da voz |
| `PUT` | `/api/voices/:id` | Atualizar voz |
| `DELETE` | `/api/voices/:id` | Deletar voz |
| `POST` | `/api/voices/:id/clips` | Upload de clip |
| `POST` | `/api/voices/:id/clips/record` | Gravar clip |
| `PUT` | `/api/voices/:id/clips/:clipId` | Atualizar transcrição |
| `DELETE` | `/api/voices/:id/clips/:clipId` | Deletar clip |
| `POST` | `/api/tts/generate` | Gerar áudio (TTS) |
| `GET` | `/api/tts/history` | Histórico de gerações |
| `POST` | `/api/transcribe` | Transcrever áudio (STT) |
| `GET` | `/api/health` | Status do servidor e modelo |
