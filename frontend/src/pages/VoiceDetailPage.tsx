import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { api, type Voice, type ClipSummary } from '../api/client';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioUploader } from '../components/AudioUploader';
import { ClipPlayer } from '../components/ClipPlayer';

export function VoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [voice, setVoice] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending clip: audio that needs a transcript before saving
  const [pendingAudio, setPendingAudio] = useState<{ blob: Blob; isUpload: boolean } | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [uploadingClip, setUploadingClip] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const fetchVoice = useCallback(async () => {
    if (!id) return;
    try {
      const v = await api.getVoice(id);
      setVoice(v);
      setName(v.name);
      setDescription(v.description || '');
    } catch {
      setError('Voz não encontrada');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVoice();
  }, [fetchVoice]);

  const handleSaveInfo = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateVoice(id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setVoice((prev) => (prev ? { ...prev, ...updated } : prev));
    } finally {
      setSaving(false);
    }
  };

  const autoTranscribe = useCallback(async (blob: Blob) => {
    setTranscribing(true);
    try {
      const result = await api.transcribe(blob);
      setPendingTranscript(result.text);
    } catch {
      // Silently fail — user can type manually
    } finally {
      setTranscribing(false);
    }
  }, []);

  const setPendingAndTranscribe = useCallback((audio: { blob: Blob; isUpload: boolean }) => {
    setPendingAudio(audio);
    setPendingTranscript('');
    autoTranscribe(audio.blob);
  }, [autoTranscribe]);

  const handleAddClip = async () => {
    if (!id || !pendingAudio || !pendingTranscript.trim()) return;
    setUploadingClip(true);
    setError(null);
    try {
      if (pendingAudio.isUpload) {
        await api.uploadClip(id, pendingAudio.blob as File, pendingTranscript.trim());
      } else {
        await api.recordClip(id, pendingAudio.blob, pendingTranscript.trim());
      }
      setPendingAudio(null);
      setPendingTranscript('');
      await fetchVoice();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar clip');
    } finally {
      setUploadingClip(false);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!id || !confirm('Excluir este clip?')) return;
    await api.deleteClip(id, clipId);
    await fetchVoice();
  };

  const handleTranscriptChange = async (clipId: string, transcript: string) => {
    if (!id || !voice) return;
    // Optimistic update
    setVoice({
      ...voice,
      clips: voice.clips.map((c) =>
        c.id === clipId ? { ...c, transcript } : c,
      ),
    });
    // Debounced save would be better, but for simplicity we save on blur
  };

  const handleTranscriptBlur = async (clipId: string) => {
    if (!id || !voice) return;
    const clip = voice.clips.find((c) => c.id === clipId);
    if (clip) {
      await api.updateClipTranscript(id, clipId, clip.transcript);
    }
  };

  if (loading) {
    return <div className="text-text-muted text-center py-12">Carregando...</div>;
  }

  if (!voice) {
    return <div className="text-center py-12 text-danger">{error || 'Voz não encontrada'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="p-2 text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Editar Voz</h1>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Voice Info */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div>
          <label className="text-xs text-text-muted block mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleSaveInfo}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Clips */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Clips de Áudio</h2>

        {voice.clips.length > 0 && (
          <div className="grid gap-3">
            {voice.clips.map((clip) => (
              <div key={clip.id} onBlur={() => handleTranscriptBlur(clip.id)}>
                <ClipPlayer
                  voiceId={voice.id}
                  clip={clip}
                  onTranscriptChange={handleTranscriptChange}
                  onDelete={handleDeleteClip}
                />
              </div>
            ))}
          </div>
        )}

        {voice.clips.length === 0 && !pendingAudio && (
          <p className="text-sm text-text-muted py-4">
            Nenhum clip ainda. Grave ou faça upload de um trecho de áudio (10-30 segundos).
          </p>
        )}

        {/* Add clip controls */}
        {!pendingAudio && (
          <div className="flex gap-3">
            <AudioRecorder onRecorded={(blob) => setPendingAndTranscribe({ blob, isUpload: false })} />
            <AudioUploader onFileSelected={(file) => setPendingAndTranscribe({ blob: file, isUpload: true })} />
          </div>
        )}

        {/* Pending clip - needs transcript */}
        {pendingAudio && (
          <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">
              {pendingAudio.isUpload ? 'Arquivo selecionado' : 'Gravação pronta'}
              {pendingAudio.isUpload && pendingAudio.blob instanceof File && (
                <span className="text-text-muted ml-2">({pendingAudio.blob.name})</span>
              )}
            </p>

            <div>
              <label className="text-xs text-text-muted block mb-1 flex items-center gap-2">
                Transcrição (o que foi falado no áudio) *
                {transcribing && (
                  <span className="flex items-center gap-1 text-accent">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Transcrevendo...
                  </span>
                )}
              </label>
              <textarea
                value={pendingTranscript}
                onChange={(e) => setPendingTranscript(e.target.value)}
                placeholder={transcribing ? "Transcrevendo automaticamente..." : "Transcrição do que foi falado no áudio..."}
                rows={3}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-none focus:outline-none focus:border-accent"
                autoFocus={!transcribing}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddClip}
                disabled={uploadingClip || !pendingTranscript.trim()}
                className="px-4 py-2 bg-success hover:bg-success/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {uploadingClip ? 'Processando...' : 'Salvar Clip'}
              </button>
              <button
                onClick={() => {
                  setPendingAudio(null);
                  setPendingTranscript('');
                }}
                className="px-4 py-2 border border-border hover:bg-surface-hover text-text rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick action */}
      {voice.clips.length > 0 && (
        <div className="pt-4 border-t border-border">
          <Link
            to={`/generate?voice=${voice.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            Usar esta voz para gerar áudio
          </Link>
        </div>
      )}
    </div>
  );
}
