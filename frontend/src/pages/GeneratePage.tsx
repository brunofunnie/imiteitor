import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AudioLines, Download, Loader2, Trash2 } from 'lucide-react';
import { api, type VoiceListItem, type Voice, type TTSResult } from '../api/client';

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function GeneratePage() {
  const [searchParams] = useSearchParams();
  const preselectedVoiceId = searchParams.get('voice');

  const [voices, setVoices] = useState<VoiceListItem[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(preselectedVoiceId || '');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedClipId, setSelectedClipId] = useState('');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<TTSResult | null>(null);
  const [history, setHistory] = useState<TTSResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ model_loaded: boolean } | null>(null);

  // Load voices and health on mount
  useEffect(() => {
    api.listVoices().then(setVoices);
    api.health().then(setHealth).catch(() => {});
    api.getHistory().then(setHistory).catch(() => {});
  }, []);

  // Load voice details when selection changes
  useEffect(() => {
    if (!selectedVoiceId) {
      setSelectedVoice(null);
      setSelectedClipId('');
      return;
    }
    api.getVoice(selectedVoiceId).then((v) => {
      setSelectedVoice(v);
      setSelectedClipId(''); // auto
    });
  }, [selectedVoiceId]);

  const handleGenerate = async () => {
    if (!selectedVoiceId || !text.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.generate(
        selectedVoiceId,
        text.trim(),
        selectedClipId || undefined,
      );
      setResult(res);
      setHistory((prev) => [res, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na geração');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    await api.deleteGenerated(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (result?.id === id) setResult(null);
  };

  const usableVoices = voices.filter((v) => v.clip_count > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gerar Áudio</h1>

      {health && !health.model_loaded && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg text-sm">
          O modelo TTS ainda não foi carregado. A geração não estará disponível até o modelo ser carregado.
        </div>
      )}

      {error && (
        <div className="text-sm text-danger bg-danger/10 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
        {/* Voice selection */}
        <div>
          <label className="text-xs text-text-muted block mb-1">Voz</label>
          {usableVoices.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nenhuma voz com clips disponível.{' '}
              <Link to="/" className="text-accent hover:text-accent-hover">
                Criar uma voz
              </Link>
            </p>
          ) : (
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="">Selecionar voz...</option>
              {usableVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.clip_count} clip{v.clip_count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Clip selection */}
        {selectedVoice && selectedVoice.clips.length > 0 && (
          <div>
            <label className="text-xs text-text-muted block mb-1">Clip de referência</label>
            <select
              value={selectedClipId}
              onChange={(e) => setSelectedClipId(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="">Auto (melhor clip)</option>
              {selectedVoice.clips.map((c, i) => (
                <option key={c.id} value={c.id}>
                  Clip {i + 1} — {formatDuration(c.duration)} — "{c.transcript.slice(0, 50)}
                  {c.transcript.length > 50 ? '...' : ''}"
                </option>
              ))}
            </select>

            {/* Preview */}
            {selectedClipId && (
              <audio
                src={api.getClipAudioUrl(selectedVoice.id, selectedClipId)}
                controls
                className="mt-2 w-full h-8"
              />
            )}
          </div>
        )}

        {/* Text input */}
        <div>
          <label className="text-xs text-text-muted block mb-1">Texto para sintetizar</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite o texto que você quer ouvir na voz selecionada..."
            rows={5}
            maxLength={5000}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-y focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted text-right mt-1">
            {text.length} / 5000
          </p>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedVoiceId || !text.trim() || (health !== null && !health.model_loaded)}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <AudioLines className="w-4 h-4" />
              Gerar Áudio
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-accent">Resultado</h2>
          <audio
            src={api.getGeneratedAudioUrl(result.id)}
            controls
            autoPlay
            className="w-full"
          />
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{formatDuration(result.duration)}</span>
            <a
              href={api.getGeneratedAudioUrl(result.id)}
              download={`imiteitor-${result.id}.wav`}
              className="flex items-center gap-1 text-accent hover:text-accent-hover"
            >
              <Download className="w-3.5 h-3.5" />
              Download WAV
            </a>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <div className="grid gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-4"
              >
                <audio
                  src={api.getGeneratedAudioUrl(h.id)}
                  controls
                  className="h-8 flex-shrink-0"
                />
                <p className="text-sm text-text truncate flex-1" title={h.text}>
                  "{h.text.slice(0, 80)}{h.text.length > 80 ? '...' : ''}"
                </p>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {formatDuration(h.duration)}
                </span>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {new Date(h.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <a
                  href={api.getGeneratedAudioUrl(h.id)}
                  download
                  className="p-1 text-text-muted hover:text-accent transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDeleteHistory(h.id)}
                  className="p-1 text-text-muted hover:text-danger transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
