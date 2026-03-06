import { useRef } from 'react';
import { Upload } from 'lucide-react';

const ACCEPTED = '.wav,.mp3,.m4a,.ogg,.webm,.flac,.opus';

interface Props {
  onFileSelected: (file: File) => void;
}

export function AudioUploader({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelected(file);
            e.target.value = '';
          }
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border border-border hover:border-border-hover bg-surface hover:bg-surface-hover text-text rounded-lg transition-colors text-sm font-medium"
      >
        <Upload className="w-4 h-4" />
        Upload Arquivo
      </button>
    </>
  );
}
