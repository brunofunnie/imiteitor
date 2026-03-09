import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Sparkles, ChevronDown, ChevronRight, Eraser } from 'lucide-react';

// --- Expression catalog ---

export interface Expression {
  id: string;
  label: string;
  labelPt: string;
  instruction: string; // Natural language instruction for Qwen3-TTS
  color: string;       // Tailwind-compatible color
}

export interface ExpressionCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  expressions: Expression[];
}

const EXPRESSION_CATALOG: ExpressionCategory[] = [
  {
    id: 'emotions-positive',
    label: 'Emoções Positivas',
    icon: '😊',
    color: '#22c55e',
    expressions: [
      { id: 'happy', label: 'Happy', labelPt: 'Feliz', instruction: 'with a happy and cheerful tone', color: '#4ade80' },
      { id: 'joyful', label: 'Joyful', labelPt: 'Alegre', instruction: 'with a joyful and bright tone', color: '#34d399' },
      { id: 'excited', label: 'Excited', labelPt: 'Animado', instruction: 'with an excited and energetic tone', color: '#fbbf24' },
      { id: 'enthusiastic', label: 'Enthusiastic', labelPt: 'Entusiasmado', instruction: 'with great enthusiasm and passion', color: '#f59e0b' },
      { id: 'hopeful', label: 'Hopeful', labelPt: 'Esperançoso', instruction: 'with a hopeful and optimistic tone', color: '#a3e635' },
      { id: 'proud', label: 'Proud', labelPt: 'Orgulhoso', instruction: 'with a proud and dignified tone', color: '#86efac' },
      { id: 'grateful', label: 'Grateful', labelPt: 'Grato', instruction: 'with a warm and grateful tone', color: '#6ee7b7' },
      { id: 'relieved', label: 'Relieved', labelPt: 'Aliviado', instruction: 'with a relieved and relaxed tone', color: '#5eead4' },
      { id: 'amused', label: 'Amused', labelPt: 'Divertido', instruction: 'with an amused and playful tone', color: '#fcd34d' },
      { id: 'content', label: 'Content', labelPt: 'Satisfeito', instruction: 'with a content and satisfied tone', color: '#bbf7d0' },
      { id: 'triumphant', label: 'Triumphant', labelPt: 'Triunfante', instruction: 'with a triumphant and victorious tone', color: '#facc15' },
      { id: 'euphoric', label: 'Euphoric', labelPt: 'Eufórico', instruction: 'with an euphoric and ecstatic tone', color: '#fde047' },
    ],
  },
  {
    id: 'emotions-negative',
    label: 'Emoções Negativas',
    icon: '😢',
    color: '#3b82f6',
    expressions: [
      { id: 'sad', label: 'Sad', labelPt: 'Triste', instruction: 'with a sad and sorrowful tone', color: '#60a5fa' },
      { id: 'melancholic', label: 'Melancholic', labelPt: 'Melancólico', instruction: 'with a deep melancholic and wistful tone', color: '#818cf8' },
      { id: 'nostalgic', label: 'Nostalgic', labelPt: 'Nostálgico', instruction: 'with a nostalgic and longing tone', color: '#a78bfa' },
      { id: 'disappointed', label: 'Disappointed', labelPt: 'Desapontado', instruction: 'with a disappointed and let-down tone', color: '#93c5fd' },
      { id: 'heartbroken', label: 'Heartbroken', labelPt: 'Desolado', instruction: 'with a heartbroken and devastated tone', color: '#6366f1' },
      { id: 'lonely', label: 'Lonely', labelPt: 'Solitário', instruction: 'with a lonely and isolated tone', color: '#8b5cf6' },
      { id: 'guilty', label: 'Guilty', labelPt: 'Culpado', instruction: 'with a guilty and remorseful tone', color: '#7c3aed' },
      { id: 'ashamed', label: 'Ashamed', labelPt: 'Envergonhado', instruction: 'with an ashamed and embarrassed tone', color: '#c084fc' },
      { id: 'regretful', label: 'Regretful', labelPt: 'Arrependido', instruction: 'with a regretful and sorrowful tone', color: '#a5b4fc' },
      { id: 'grieving', label: 'Grieving', labelPt: 'Enlutado', instruction: 'with a grieving and mourning tone', color: '#4f46e5' },
    ],
  },
  {
    id: 'emotions-anger',
    label: 'Raiva & Frustração',
    icon: '😠',
    color: '#ef4444',
    expressions: [
      { id: 'angry', label: 'Angry', labelPt: 'Raivoso', instruction: 'with an angry and upset tone', color: '#f87171' },
      { id: 'furious', label: 'Furious', labelPt: 'Furioso', instruction: 'with a furious and enraged tone', color: '#ef4444' },
      { id: 'irritated', label: 'Irritated', labelPt: 'Irritado', instruction: 'with an irritated and annoyed tone', color: '#fb923c' },
      { id: 'frustrated', label: 'Frustrated', labelPt: 'Frustrado', instruction: 'with a frustrated and exasperated tone', color: '#f97316' },
      { id: 'resentful', label: 'Resentful', labelPt: 'Ressentido', instruction: 'with a resentful and bitter tone', color: '#dc2626' },
      { id: 'indignant', label: 'Indignant', labelPt: 'Indignado', instruction: 'with an indignant and outraged tone', color: '#ea580c' },
      { id: 'contemptuous', label: 'Contemptuous', labelPt: 'Desdenhoso', instruction: 'with a contemptuous and scornful tone', color: '#b91c1c' },
      { id: 'jealous', label: 'Jealous', labelPt: 'Ciumento', instruction: 'with a jealous and envious tone', color: '#e11d48' },
    ],
  },
  {
    id: 'emotions-fear',
    label: 'Medo & Ansiedade',
    icon: '😰',
    color: '#a855f7',
    expressions: [
      { id: 'fearful', label: 'Fearful', labelPt: 'Temeroso', instruction: 'with a fearful and scared tone', color: '#c084fc' },
      { id: 'terrified', label: 'Terrified', labelPt: 'Aterrorizado', instruction: 'with a terrified and panicked tone', color: '#a855f7' },
      { id: 'anxious', label: 'Anxious', labelPt: 'Ansioso', instruction: 'with an anxious and worried tone', color: '#d8b4fe' },
      { id: 'nervous', label: 'Nervous', labelPt: 'Nervoso', instruction: 'with a nervous and jittery tone', color: '#e9d5ff' },
      { id: 'paranoid', label: 'Paranoid', labelPt: 'Paranoico', instruction: 'with a paranoid and suspicious tone', color: '#9333ea' },
      { id: 'uneasy', label: 'Uneasy', labelPt: 'Inquieto', instruction: 'with an uneasy and uncomfortable tone', color: '#d946ef' },
      { id: 'horrified', label: 'Horrified', labelPt: 'Horrorizado', instruction: 'with a horrified and shocked tone', color: '#7e22ce' },
      { id: 'dread', label: 'Dread', labelPt: 'Pavor', instruction: 'with a sense of dread and foreboding', color: '#6b21a8' },
    ],
  },
  {
    id: 'emotions-surprise',
    label: 'Surpresa & Curiosidade',
    icon: '😲',
    color: '#ec4899',
    expressions: [
      { id: 'surprised', label: 'Surprised', labelPt: 'Surpreso', instruction: 'with a surprised and astonished tone', color: '#f472b6' },
      { id: 'shocked', label: 'Shocked', labelPt: 'Chocado', instruction: 'with a shocked and stunned tone', color: '#ec4899' },
      { id: 'amazed', label: 'Amazed', labelPt: 'Maravilhado', instruction: 'with an amazed and awestruck tone', color: '#f9a8d4' },
      { id: 'curious', label: 'Curious', labelPt: 'Curioso', instruction: 'with a curious and inquisitive tone', color: '#fb7185' },
      { id: 'intrigued', label: 'Intrigued', labelPt: 'Intrigado', instruction: 'with an intrigued and fascinated tone', color: '#fda4af' },
      { id: 'bewildered', label: 'Bewildered', labelPt: 'Perplexo', instruction: 'with a bewildered and confused tone', color: '#e879f9' },
      { id: 'skeptical', label: 'Skeptical', labelPt: 'Cético', instruction: 'with a skeptical and doubtful tone', color: '#f0abfc' },
    ],
  },
  {
    id: 'emotions-calm',
    label: 'Calma & Serenidade',
    icon: '😌',
    color: '#06b6d4',
    expressions: [
      { id: 'calm', label: 'Calm', labelPt: 'Calmo', instruction: 'with a calm and composed tone', color: '#22d3ee' },
      { id: 'peaceful', label: 'Peaceful', labelPt: 'Sereno', instruction: 'with a peaceful and tranquil tone', color: '#67e8f9' },
      { id: 'serene', label: 'Serene', labelPt: 'Tranquilo', instruction: 'with a serene and still tone', color: '#a5f3fc' },
      { id: 'meditative', label: 'Meditative', labelPt: 'Meditativo', instruction: 'with a meditative and contemplative tone', color: '#99f6e4' },
      { id: 'zen', label: 'Zen', labelPt: 'Zen', instruction: 'with a deeply zen and balanced tone', color: '#5eead4' },
      { id: 'reassuring', label: 'Reassuring', labelPt: 'Tranquilizador', instruction: 'with a reassuring and comforting tone', color: '#2dd4bf' },
    ],
  },
  {
    id: 'emotions-love',
    label: 'Amor & Afeto',
    icon: '❤️',
    color: '#f43f5e',
    expressions: [
      { id: 'loving', label: 'Loving', labelPt: 'Amoroso', instruction: 'with a loving and affectionate tone', color: '#fb7185' },
      { id: 'tender', label: 'Tender', labelPt: 'Carinhoso', instruction: 'with a tender and gentle tone', color: '#fda4af' },
      { id: 'romantic', label: 'Romantic', labelPt: 'Romântico', instruction: 'with a romantic and passionate tone', color: '#f43f5e' },
      { id: 'compassionate', label: 'Compassionate', labelPt: 'Compassivo', instruction: 'with a compassionate and caring tone', color: '#fecdd3' },
      { id: 'sympathetic', label: 'Sympathetic', labelPt: 'Simpático', instruction: 'with a sympathetic and understanding tone', color: '#fca5a5' },
      { id: 'adoring', label: 'Adoring', labelPt: 'Adorável', instruction: 'with an adoring and devoted tone', color: '#f9a8d4' },
      { id: 'flirtatious', label: 'Flirtatious', labelPt: 'Sedutor', instruction: 'with a flirtatious and charming tone', color: '#e11d48' },
    ],
  },
  {
    id: 'tone',
    label: 'Tom de Voz',
    icon: '🎭',
    color: '#8b5cf6',
    expressions: [
      { id: 'formal', label: 'Formal', labelPt: 'Formal', instruction: 'in a formal and professional manner', color: '#6366f1' },
      { id: 'informal', label: 'Informal', labelPt: 'Informal', instruction: 'in a casual and informal manner', color: '#a78bfa' },
      { id: 'warm', label: 'Warm', labelPt: 'Caloroso', instruction: 'with a warm and inviting tone', color: '#fbbf24' },
      { id: 'cold', label: 'Cold', labelPt: 'Frio', instruction: 'with a cold and distant tone', color: '#94a3b8' },
      { id: 'authoritative', label: 'Authoritative', labelPt: 'Autoritário', instruction: 'with an authoritative and commanding tone', color: '#475569' },
      { id: 'confident', label: 'Confident', labelPt: 'Confiante', instruction: 'with a confident and assured tone', color: '#6d28d9' },
      { id: 'uncertain', label: 'Uncertain', labelPt: 'Incerto', instruction: 'with an uncertain and hesitant tone', color: '#d4d4d8' },
      { id: 'mysterious', label: 'Mysterious', labelPt: 'Misterioso', instruction: 'with a mysterious and enigmatic tone', color: '#581c87' },
      { id: 'suspenseful', label: 'Suspenseful', labelPt: 'Suspense', instruction: 'with a suspenseful and tense tone', color: '#4c1d95' },
      { id: 'dramatic', label: 'Dramatic', labelPt: 'Dramático', instruction: 'with a dramatic and theatrical tone', color: '#7c3aed' },
      { id: 'deadpan', label: 'Deadpan', labelPt: 'Inexpressivo', instruction: 'in a completely deadpan and flat delivery', color: '#71717a' },
      { id: 'monotone', label: 'Monotone', labelPt: 'Monótono', instruction: 'in a monotone and unchanging pitch', color: '#a1a1aa' },
      { id: 'sarcastic', label: 'Sarcastic', labelPt: 'Sarcástico', instruction: 'with a sarcastic and mocking tone', color: '#f59e0b' },
      { id: 'ironic', label: 'Ironic', labelPt: 'Irônico', instruction: 'with an ironic and sardonic tone', color: '#d97706' },
      { id: 'cynical', label: 'Cynical', labelPt: 'Cínico', instruction: 'with a cynical and dismissive tone', color: '#92400e' },
      { id: 'playful', label: 'Playful', labelPt: 'Brincalhão', instruction: 'with a playful and lighthearted tone', color: '#fb923c' },
      { id: 'mischievous', label: 'Mischievous', labelPt: 'Travesso', instruction: 'with a mischievous and teasing tone', color: '#fdba74' },
      { id: 'gentle', label: 'Gentle', labelPt: 'Gentil', instruction: 'with a gentle and soft tone', color: '#bfdbfe' },
      { id: 'firm', label: 'Firm', labelPt: 'Firme', instruction: 'with a firm and resolute tone', color: '#1e40af' },
      { id: 'urgent', label: 'Urgent', labelPt: 'Urgente', instruction: 'with an urgent and pressing tone', color: '#dc2626' },
      { id: 'solemn', label: 'Solemn', labelPt: 'Solene', instruction: 'with a solemn and grave tone', color: '#1e293b' },
      { id: 'reverent', label: 'Reverent', labelPt: 'Reverente', instruction: 'with a reverent and respectful tone', color: '#334155' },
    ],
  },
  {
    id: 'speaking-style',
    label: 'Estilo de Fala',
    icon: '🗣️',
    color: '#14b8a6',
    expressions: [
      { id: 'whisper', label: 'Whisper', labelPt: 'Sussurro', instruction: 'in a soft whisper', color: '#99f6e4' },
      { id: 'shout', label: 'Shout', labelPt: 'Grito', instruction: 'shouting loudly', color: '#ef4444' },
      { id: 'murmur', label: 'Murmur', labelPt: 'Murmúrio', instruction: 'in a quiet murmur', color: '#a7f3d0' },
      { id: 'breathy', label: 'Breathy', labelPt: 'Ofegante', instruction: 'with a breathy and airy voice', color: '#d1fae5' },
      { id: 'raspy', label: 'Raspy', labelPt: 'Rouco', instruction: 'with a raspy and hoarse voice', color: '#78716c' },
      { id: 'soft', label: 'Soft', labelPt: 'Suave', instruction: 'speaking very softly and quietly', color: '#e0f2fe' },
      { id: 'loud', label: 'Loud', labelPt: 'Alto', instruction: 'speaking loudly and clearly', color: '#fca5a5' },
      { id: 'trembling', label: 'Trembling', labelPt: 'Trêmulo', instruction: 'with a trembling and shaky voice', color: '#c4b5fd' },
      { id: 'cracking', label: 'Cracking', labelPt: 'Quebradiço', instruction: 'with a voice that cracks with emotion', color: '#ddd6fe' },
      { id: 'stuttering', label: 'Stuttering', labelPt: 'Gaguejar', instruction: 'with slight stuttering and hesitation', color: '#e9d5ff' },
      { id: 'clear', label: 'Clear', labelPt: 'Claro', instruction: 'with perfect clarity and enunciation', color: '#67e8f9' },
      { id: 'crisp', label: 'Crisp', labelPt: 'Nítido', instruction: 'with crisp and precise articulation', color: '#22d3ee' },
    ],
  },
  {
    id: 'vocal-actions',
    label: 'Ações Vocais',
    icon: '🎤',
    color: '#f97316',
    expressions: [
      { id: 'laughing', label: 'Laughing', labelPt: 'Rindo', instruction: 'while laughing', color: '#fbbf24' },
      { id: 'giggling', label: 'Giggling', labelPt: 'Dando risadinha', instruction: 'while giggling softly', color: '#fde047' },
      { id: 'chuckling', label: 'Chuckling', labelPt: 'Rindo baixo', instruction: 'with a low chuckle', color: '#fef08a' },
      { id: 'crying', label: 'Crying', labelPt: 'Chorando', instruction: 'while crying', color: '#93c5fd' },
      { id: 'sobbing', label: 'Sobbing', labelPt: 'Soluçando', instruction: 'while sobbing heavily', color: '#60a5fa' },
      { id: 'sighing', label: 'Sighing', labelPt: 'Suspirando', instruction: 'with a deep sigh', color: '#d1d5db' },
      { id: 'yawning', label: 'Yawning', labelPt: 'Bocejando', instruction: 'while yawning sleepily', color: '#e5e7eb' },
      { id: 'gasping', label: 'Gasping', labelPt: 'Arfando', instruction: 'with a sharp gasp', color: '#fda4af' },
      { id: 'panting', label: 'Panting', labelPt: 'Ofegando', instruction: 'while panting and out of breath', color: '#fecaca' },
      { id: 'humming', label: 'Humming', labelPt: 'Cantarolando', instruction: 'while humming a melody', color: '#c4b5fd' },
      { id: 'singing', label: 'Singing', labelPt: 'Cantando', instruction: 'in a singing voice', color: '#a78bfa' },
      { id: 'groaning', label: 'Groaning', labelPt: 'Gemendo', instruction: 'with a groan of pain or effort', color: '#a8a29e' },
      { id: 'scoffing', label: 'Scoffing', labelPt: 'Zombando', instruction: 'with a dismissive scoff', color: '#fcd34d' },
    ],
  },
  {
    id: 'emphasis',
    label: 'Ênfase & Prosódia',
    icon: '📢',
    color: '#0ea5e9',
    expressions: [
      { id: 'strong-emphasis', label: 'Strong Emphasis', labelPt: 'Ênfase forte', instruction: 'with strong emphasis and stress', color: '#0ea5e9' },
      { id: 'light-emphasis', label: 'Light Emphasis', labelPt: 'Ênfase leve', instruction: 'with light and subtle emphasis', color: '#7dd3fc' },
      { id: 'rising', label: 'Rising Intonation', labelPt: 'Entonação ascendente', instruction: 'with a rising intonation as if asking a question', color: '#38bdf8' },
      { id: 'falling', label: 'Falling Intonation', labelPt: 'Entonação descendente', instruction: 'with a falling intonation expressing finality', color: '#0284c7' },
      { id: 'slow-down', label: 'Slow Down', labelPt: 'Desacelerar', instruction: 'speaking slowly and deliberately', color: '#bae6fd' },
      { id: 'speed-up', label: 'Speed Up', labelPt: 'Acelerar', instruction: 'speaking quickly and rapidly', color: '#0369a1' },
      { id: 'crescendo', label: 'Crescendo', labelPt: 'Crescendo', instruction: 'gradually getting louder', color: '#075985' },
      { id: 'decrescendo', label: 'Decrescendo', labelPt: 'Decrescendo', instruction: 'gradually getting quieter', color: '#e0f2fe' },
      { id: 'pause-before', label: 'Pause Before', labelPt: 'Pausa antes', instruction: 'with a dramatic pause before speaking', color: '#cbd5e1' },
      { id: 'pause-after', label: 'Pause After', labelPt: 'Pausa depois', instruction: 'followed by a meaningful pause', color: '#94a3b8' },
      { id: 'drawn-out', label: 'Drawn Out', labelPt: 'Prolongado', instruction: 'drawing out and elongating the words', color: '#64748b' },
      { id: 'clipped', label: 'Clipped', labelPt: 'Cortado', instruction: 'with short clipped delivery', color: '#475569' },
    ],
  },
  {
    id: 'character',
    label: 'Personagem',
    icon: '🎬',
    color: '#eab308',
    expressions: [
      { id: 'narrator', label: 'Narrator', labelPt: 'Narrador', instruction: 'like a professional narrator telling a story', color: '#a16207' },
      { id: 'news-anchor', label: 'News Anchor', labelPt: 'Âncora de Jornal', instruction: 'like a news anchor reading the news professionally', color: '#ca8a04' },
      { id: 'radio-dj', label: 'Radio DJ', labelPt: 'DJ de Rádio', instruction: 'like an upbeat radio DJ', color: '#eab308' },
      { id: 'storyteller', label: 'Storyteller', labelPt: 'Contador de Histórias', instruction: 'like a captivating storyteller', color: '#facc15' },
      { id: 'teacher', label: 'Teacher', labelPt: 'Professor', instruction: 'like a patient and clear teacher explaining', color: '#fde047' },
      { id: 'coach', label: 'Coach', labelPt: 'Treinador', instruction: 'like a motivational coach', color: '#fef08a' },
      { id: 'announcer', label: 'Announcer', labelPt: 'Locutor', instruction: 'like a grand event announcer', color: '#854d0e' },
      { id: 'auctioneer', label: 'Auctioneer', labelPt: 'Leiloeiro', instruction: 'like a fast-talking auctioneer', color: '#713f12' },
      { id: 'villain', label: 'Villain', labelPt: 'Vilão', instruction: 'like a menacing villain', color: '#7f1d1d' },
      { id: 'hero', label: 'Hero', labelPt: 'Herói', instruction: 'like a brave and noble hero', color: '#1e40af' },
      { id: 'wise-elder', label: 'Wise Elder', labelPt: 'Sábio Ancião', instruction: 'like a wise old sage sharing wisdom', color: '#92400e' },
      { id: 'child-voice', label: 'Child', labelPt: 'Criança', instruction: 'like a young child speaking', color: '#f9a8d4' },
      { id: 'robot', label: 'Robot', labelPt: 'Robô', instruction: 'like a mechanical robot with no emotion', color: '#71717a' },
      { id: 'ghost', label: 'Ghost', labelPt: 'Fantasma', instruction: 'like an eerie ghostly whisper', color: '#d4d4d8' },
      { id: 'drunk', label: 'Drunk', labelPt: 'Bêbado', instruction: 'like someone who is drunk with slurred speech', color: '#a3a3a3' },
      { id: 'sleepy', label: 'Sleepy', labelPt: 'Sonolento', instruction: 'like someone who is very sleepy and drowsy', color: '#e2e8f0' },
    ],
  },
];

// --- Annotation data model ---

export interface Annotation {
  id: string;
  start: number;
  end: number;
  expression: Expression;
}

interface InstructEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

// --- Helper: build text runs from annotations ---

interface TextRun {
  text: string;
  start: number;
  end: number;
  annotation?: Annotation;
}

function buildRuns(text: string, annotations: Annotation[]): TextRun[] {
  if (text.length === 0) return [];

  // Sort annotations by start position
  const sorted = [...annotations].sort((a, b) => a.start - b.start || a.end - b.end);

  const runs: TextRun[] = [];
  let cursor = 0;

  for (const ann of sorted) {
    // Plain text before this annotation
    if (ann.start > cursor) {
      runs.push({ text: text.slice(cursor, ann.start), start: cursor, end: ann.start });
    }
    // Annotated text
    runs.push({ text: text.slice(ann.start, ann.end), start: ann.start, end: ann.end, annotation: ann });
    cursor = ann.end;
  }

  // Remaining plain text
  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), start: cursor, end: text.length });
  }

  return runs;
}

// --- Generate instruct prompt for Qwen3-TTS ---

export function generateInstructText(_text: string, annotations: Annotation[]): string {
  if (annotations.length === 0) return '';

  // Deduplicate expression types and build a natural language instruction
  const uniqueExpressions = new Map<string, Expression>();
  for (const ann of annotations) {
    if (!uniqueExpressions.has(ann.expression.id)) {
      uniqueExpressions.set(ann.expression.id, ann.expression);
    }
  }

  // If all annotations use the same expression, use a simple instruction
  if (uniqueExpressions.size === 1) {
    const expr = [...uniqueExpressions.values()][0];
    return `Speak ${expr.instruction}.`;
  }

  // Multiple expressions: describe each part
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const parts = sorted.map((ann) => {
    const snippet = _text.slice(ann.start, ann.end);
    return `"${snippet}" ${ann.expression.instruction}`;
  });

  return `Say ${parts.join(', and ')}.`;
}

// --- Component ---

let _nextId = 1;
function nextId() {
  return `ann-${_nextId++}`;
}

export function InstructEditor({ text, onTextChange, annotations, onAnnotationsChange }: InstructEditorProps) {
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close catalog when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        if (showCatalog && !editingAnnotationId) {
          setShowCatalog(false);
          setSelectionRange(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCatalog, editingAnnotationId]);

  // Handle text selection in the display area
  const handleMouseUp = useCallback(() => {
    if (isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !displayRef.current) {
      return;
    }

    // Check if selection is within our display div
    if (!displayRef.current.contains(selection.anchorNode) || !displayRef.current.contains(selection.focusNode)) {
      return;
    }

    // Map selection to text offsets using data-offset attributes
    const range = selection.getRangeAt(0);
    const startOffset = getTextOffset(displayRef.current, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(displayRef.current, range.endContainer, range.endOffset);

    if (startOffset !== null && endOffset !== null && startOffset !== endOffset) {
      const start = Math.min(startOffset, endOffset);
      const end = Math.max(startOffset, endOffset);
      setSelectionRange({ start, end });
      setShowCatalog(true);
      setEditingAnnotationId(null);
      setExpandedCategory(null);
      setSearchFilter('');
    }
  }, [isEditing]);

  // Get text offset from DOM position
  function getTextOffset(container: HTMLElement, node: Node | null, offset: number): number | null {
    if (!node) return null;

    // Find the span ancestor with data-start attribute
    let span: HTMLElement | null = null;
    let current: Node | null = node;
    while (current && current !== container) {
      if (current instanceof HTMLElement && current.hasAttribute('data-start')) {
        span = current;
        break;
      }
      current = current.parentNode;
    }

    if (!span) return null;
    const spanStart = parseInt(span.getAttribute('data-start')!, 10);
    return spanStart + offset;
  }

  // Apply expression to selection
  const applyExpression = useCallback((expression: Expression) => {
    if (editingAnnotationId) {
      // Update existing annotation
      onAnnotationsChange(
        annotations.map((a) => (a.id === editingAnnotationId ? { ...a, expression } : a)),
      );
      setEditingAnnotationId(null);
      setShowCatalog(false);
      return;
    }

    if (!selectionRange) return;

    const { start, end } = selectionRange;

    // Remove any overlapping annotations
    const nonOverlapping = annotations.filter(
      (a) => a.end <= start || a.start >= end,
    );

    // Trim partially overlapping annotations
    const trimmed = annotations
      .filter((a) => !(a.end <= start || a.start >= end))
      .flatMap((a) => {
        const parts: Annotation[] = [];
        if (a.start < start) {
          parts.push({ ...a, id: nextId(), end: start });
        }
        if (a.end > end) {
          parts.push({ ...a, id: nextId(), start: end });
        }
        return parts;
      });

    const newAnnotation: Annotation = {
      id: nextId(),
      start,
      end,
      expression,
    };

    onAnnotationsChange([...nonOverlapping, ...trimmed, newAnnotation]);
    setSelectionRange(null);
    setShowCatalog(false);
    window.getSelection()?.removeAllRanges();
  }, [selectionRange, editingAnnotationId, annotations, onAnnotationsChange]);

  // Remove annotation
  const removeAnnotation = useCallback((id: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
    setEditingAnnotationId(null);
    setShowCatalog(false);
  }, [annotations, onAnnotationsChange]);

  // Click on an annotated span
  const handleAnnotationClick = useCallback((annotationId: string) => {
    setEditingAnnotationId(annotationId);
    setShowCatalog(true);
    setSelectionRange(null);
    setExpandedCategory(null);
    setSearchFilter('');
  }, []);

  // Switch to editing mode
  const switchToEdit = useCallback(() => {
    setIsEditing(true);
    setShowCatalog(false);
    setSelectionRange(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  // Switch to annotate mode
  const switchToAnnotate = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Filter expressions by search
  const filteredCatalog = searchFilter.trim()
    ? EXPRESSION_CATALOG.map((cat) => ({
        ...cat,
        expressions: cat.expressions.filter(
          (e) =>
            e.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
            e.labelPt.toLowerCase().includes(searchFilter.toLowerCase()) ||
            e.instruction.toLowerCase().includes(searchFilter.toLowerCase()),
        ),
      })).filter((cat) => cat.expressions.length > 0)
    : EXPRESSION_CATALOG;

  const runs = buildRuns(text, annotations);
  const selectedText = selectionRange ? text.slice(selectionRange.start, selectionRange.end) : '';
  const editingAnnotation = editingAnnotationId ? annotations.find((a) => a.id === editingAnnotationId) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-text-muted">Texto para sintetizar</label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={switchToEdit}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isEditing
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text bg-bg border border-border'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={switchToAnnotate}
            className={`px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1 ${
              !isEditing
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text bg-bg border border-border'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Anotar
          </button>
        </div>
      </div>

      {/* Edit mode: textarea */}
      {isEditing && (
        <div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              const newText = e.target.value;
              // Adjust annotations when text changes
              if (newText.length !== text.length && annotations.length > 0) {
                // Simple approach: clear annotations that are now out of bounds
                const valid = annotations.filter((a) => a.start < newText.length && a.end <= newText.length);
                if (valid.length !== annotations.length) {
                  onAnnotationsChange(valid);
                }
              }
              onTextChange(newText);
            }}
            placeholder="Digite o texto que você quer ouvir na voz selecionada..."
            rows={5}
            maxLength={5000}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-y focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted text-right mt-1">{text.length} / 5000</p>
        </div>
      )}

      {/* Annotate mode: display with selection */}
      {!isEditing && (
        <div className="relative">
          <div
            ref={displayRef}
            onMouseUp={handleMouseUp}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text min-h-[120px] cursor-text select-text whitespace-pre-wrap break-words leading-relaxed"
          >
            {text.length === 0 ? (
              <span className="text-text-muted italic">
                Mude para o modo "Editar" para digitar texto, depois volte para "Anotar" para aplicar expressões.
              </span>
            ) : (
              runs.map((run, i) =>
                run.annotation ? (
                  <span
                    key={i}
                    data-start={run.start}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnnotationClick(run.annotation!.id);
                    }}
                    className="relative cursor-pointer rounded px-0.5 -mx-0.5 transition-all hover:ring-1 hover:ring-white/30"
                    style={{
                      backgroundColor: run.annotation.expression.color + '25',
                      borderBottom: `2px solid ${run.annotation.expression.color}`,
                    }}
                  >
                    <span
                      className="absolute -top-4 left-0 text-[9px] font-medium leading-none px-1 py-0.5 rounded whitespace-nowrap pointer-events-none"
                      style={{
                        backgroundColor: run.annotation.expression.color,
                        color: '#000',
                      }}
                    >
                      {run.annotation.expression.labelPt}
                    </span>
                    {run.text}
                  </span>
                ) : (
                  <span key={i} data-start={run.start}>
                    {run.text}
                  </span>
                ),
              )
            )}
          </div>
          <p className="text-xs text-text-muted text-right mt-1">{text.length} / 5000</p>

          {/* Selection info */}
          {selectionRange && !showCatalog && (
            <div className="absolute -top-8 left-0 bg-surface border border-border rounded px-2 py-1 text-xs text-text shadow-lg">
              Selecionado: "{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}"
            </div>
          )}
        </div>
      )}

      {/* Expression catalog popover */}
      {showCatalog && (
        <div
          ref={catalogRef}
          className="bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-bg/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">
                {editingAnnotation ? (
                  <>
                    Editando: <span style={{ color: editingAnnotation.expression.color }}>"{text.slice(editingAnnotation.start, editingAnnotation.end).slice(0, 30)}"</span>
                  </>
                ) : (
                  <>
                    Aplicar expressão a: <span className="text-accent">"{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}"</span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1">
                {editingAnnotation && (
                  <button
                    onClick={() => removeAnnotation(editingAnnotation.id)}
                    className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Remover expressão"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCatalog(false);
                    setSelectionRange(null);
                    setEditingAnnotationId(null);
                  }}
                  className="p-1 text-text-muted hover:text-text rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar expressão... (ex: happy, triste, whisper)"
              className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Categories */}
          <div className="max-h-[340px] overflow-y-auto">
            {filteredCatalog.map((cat) => {
              const isExpanded = expandedCategory === cat.id || searchFilter.trim().length > 0;
              return (
                <div key={cat.id} className="border-b border-border/50 last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded && !searchFilter ? null : cat.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text hover:bg-bg/50 transition-colors"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="text-text-muted ml-auto text-[10px]">{cat.expressions.length}</span>
                    {searchFilter ? null : isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-text-muted" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2 flex flex-wrap gap-1">
                      {cat.expressions.map((expr) => (
                        <button
                          key={expr.id}
                          type="button"
                          onClick={() => applyExpression(expr)}
                          className="px-2 py-1 text-[11px] rounded-full border transition-all hover:scale-105 hover:shadow-md"
                          style={{
                            borderColor: expr.color + '60',
                            backgroundColor: expr.color + '15',
                            color: expr.color,
                          }}
                          title={expr.instruction}
                        >
                          {expr.labelPt}
                          <span className="text-[9px] opacity-60 ml-1">({expr.label})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active annotations summary */}
      {annotations.length > 0 && !isEditing && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Anotações ({annotations.length})
            </span>
            <button
              type="button"
              onClick={() => onAnnotationsChange([])}
              className="text-[10px] text-text-muted hover:text-danger transition-colors underline"
            >
              Limpar todas
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[...annotations]
              .sort((a, b) => a.start - b.start)
              .map((ann) => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => handleAnnotationClick(ann.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border transition-all hover:scale-105 group"
                  style={{
                    borderColor: ann.expression.color + '60',
                    backgroundColor: ann.expression.color + '15',
                    color: ann.expression.color,
                  }}
                >
                  <span className="font-medium">{ann.expression.labelPt}</span>
                  <span className="opacity-50">"{text.slice(ann.start, ann.end).slice(0, 20)}{text.slice(ann.start, ann.end).length > 20 ? '…' : ''}"</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnnotation(ann.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-danger transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
