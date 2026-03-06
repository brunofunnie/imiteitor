import { Trash2 } from 'lucide-react';
import { api, type ClipSummary } from '../api/client';

interface Props {
  voiceId: string;
  clip: ClipSummary;
  onTranscriptChange?: (clipId: string, transcript: string) => void;
  onDelete?: (clipId: string) => void;
}

function formatDuration(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

export function ClipPlayer({ voiceId, clip, onTranscriptChange, onDelete }: Props) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">
          {formatDuration(clip.duration)}
        </span>
        {onDelete && (
          <button
            onClick={() => onDelete(clip.id)}
            className="p-1 text-text-muted hover:text-danger transition-colors"
            title="Excluir clip"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <audio
        src={api.getClipAudioUrl(voiceId, clip.id)}
        controls
        className="w-full h-8"
      />

      <div>
        <label className="text-xs text-text-muted block mb-1">Transcrição</label>
        <textarea
          value={clip.transcript}
          onChange={(e) => onTranscriptChange?.(clip.id, e.target.value)}
          rows={2}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-none focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
