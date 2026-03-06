import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  duration: number;
  blob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  error: string | null;
}

export function useAudioRecorder(
  minDuration = 10,
  maxDuration = 30,
): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: recorder.mimeType });
        const elapsed = (Date.now() - startTimeRef.current) / 1000;

        if (elapsed < minDuration) {
          setError(`Gravação muito curta: ${elapsed.toFixed(1)}s (mínimo ${minDuration}s)`);
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setBlob(recorded);
        setAudioUrl(URL.createObjectURL(recorded));
        stream.getTracks().forEach((t) => t.stop());
      };

      startTimeRef.current = Date.now();
      setDuration(0);
      setIsRecording(true);
      recorder.start(250); // collect data every 250ms

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          recorder.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 100);
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [audioUrl, minDuration, maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setDuration(0);
    setBlob(null);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [cleanup, audioUrl]);

  return { isRecording, duration, blob, audioUrl, startRecording, stopRecording, reset, error };
}
