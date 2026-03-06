import { Mic, Square, RotateCcw } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface Props {
  onRecorded: (blob: Blob) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function AudioRecorder({ onRecorded }: Props) {
  const { isRecording, duration, blob, audioUrl, startRecording, stopRecording, reset, error } =
    useAudioRecorder(10, 30);

  const canStop = duration >= 10;

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</div>
      )}

      {!isRecording && !blob && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Mic className="w-4 h-4" />
          Gravar Clip
        </button>
      )}

      {isRecording && (
        <div className="flex items-center gap-4 bg-surface p-4 rounded-lg border border-border">
          <div className="w-3 h-3 rounded-full bg-danger animate-pulse" />
          <span className="font-mono text-lg">{formatTime(duration)}</span>
          <span className="text-text-muted text-sm">/ 00:30</span>

          {/* Progress bar */}
          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${Math.min((duration / 30) * 100, 100)}%`,
                backgroundColor: duration < 10 ? '#ef4444' : '#7c5cfc',
              }}
            />
          </div>

          <button
            onClick={stopRecording}
            disabled={!canStop}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              canStop
                ? 'bg-danger hover:bg-danger-hover text-white'
                : 'bg-border text-text-muted cursor-not-allowed'
            }`}
          >
            <Square className="w-3 h-3" />
            Parar
          </button>

          {!canStop && (
            <span className="text-xs text-text-muted">Mín. 10s</span>
          )}
        </div>
      )}

      {blob && audioUrl && (
        <div className="flex items-center gap-3 bg-surface p-4 rounded-lg border border-border">
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <button
            onClick={() => {
              onRecorded(blob);
              reset();
            }}
            className="px-3 py-1.5 bg-success hover:bg-success/80 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Usar
          </button>
          <button
            onClick={reset}
            className="p-1.5 text-text-muted hover:text-text transition-colors"
            title="Gravar novamente"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
