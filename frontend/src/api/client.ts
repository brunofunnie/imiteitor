const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Types ---

export interface VoiceListItem {
  id: string;
  name: string;
  description: string | null;
  clip_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClipSummary {
  id: string;
  filename: string;
  duration: number;
  transcript: string;
  created_at: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  clips: ClipSummary[];
}

export interface Clip {
  id: string;
  voice_id: string;
  filename: string;
  duration: number;
  transcript: string;
  sample_rate: number;
  created_at: string;
}

export interface TTSResult {
  id: string;
  voice_id: string;
  clip_id: string;
  text: string;
  audio_url: string;
  duration: number;
  created_at: string;
}

export interface Health {
  status: string;
  model_loaded: boolean;
  model_name: string | null;
}

// --- API ---

export const api = {
  // Voices
  listVoices: () => request<VoiceListItem[]>('/voices'),
  createVoice: (name: string, description?: string) =>
    request<Voice>('/voices', { method: 'POST', body: JSON.stringify({ name, description }) }),
  getVoice: (id: string) => request<Voice>(`/voices/${id}`),
  updateVoice: (id: string, data: { name?: string; description?: string }) =>
    request<Voice>(`/voices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVoice: (id: string) => request<void>(`/voices/${id}`, { method: 'DELETE' }),

  // Clips
  uploadClip: (voiceId: string, file: File | Blob, transcript: string) => {
    const form = new FormData();
    form.append('file', file, file instanceof File ? file.name : 'recording.webm');
    form.append('transcript', transcript);
    return request<Clip>(`/voices/${voiceId}/clips`, { method: 'POST', body: form });
  },
  recordClip: (voiceId: string, blob: Blob, transcript: string) => {
    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    form.append('transcript', transcript);
    return request<Clip>(`/voices/${voiceId}/clips/record`, { method: 'POST', body: form });
  },
  updateClipTranscript: (voiceId: string, clipId: string, transcript: string) =>
    request<Clip>(`/voices/${voiceId}/clips/${clipId}`, {
      method: 'PUT',
      body: JSON.stringify({ transcript }),
    }),
  deleteClip: (voiceId: string, clipId: string) =>
    request<void>(`/voices/${voiceId}/clips/${clipId}`, { method: 'DELETE' }),
  getClipAudioUrl: (voiceId: string, clipId: string) =>
    `${BASE}/voices/${voiceId}/clips/${clipId}/audio`,

  // TTS
  generate: (voiceId: string, text: string, clipId?: string) =>
    request<TTSResult>('/tts/generate', {
      method: 'POST',
      body: JSON.stringify({ voice_id: voiceId, text, clip_id: clipId || null }),
    }),
  getHistory: (voiceId?: string) =>
    request<TTSResult[]>(`/tts/history${voiceId ? `?voice_id=${voiceId}` : ''}`),
  getGeneratedAudioUrl: (id: string) => `${BASE}/tts/${id}/audio`,
  deleteGenerated: (id: string) => request<void>(`/tts/${id}`, { method: 'DELETE' }),

  // Transcription
  transcribe: (file: File | Blob) => {
    const form = new FormData();
    form.append('file', file, file instanceof File ? file.name : 'audio.webm');
    return request<{ text: string }>('/transcribe', { method: 'POST', body: form });
  },

  // System
  health: () => request<Health>('/health'),
};
