import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, AudioLines, Pencil, Trash2, Mic } from 'lucide-react';
import { api, type VoiceListItem } from '../api/client';

export function VoicesPage() {
  const [voices, setVoices] = useState<VoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchVoices = async () => {
    try {
      setVoices(await api.listVoices());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const voice = await api.createVoice(newName.trim(), newDesc.trim() || undefined);
      navigate(`/voices/${voice.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a voz "${name}" e todos os seus clips?`)) return;
    await api.deleteVoice(id);
    setVoices((prev) => prev.filter((v) => v.id !== id));
  };

  if (loading) {
    return <div className="text-text-muted text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vozes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova Voz
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-surface border border-border rounded-lg p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Nome da voz"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            autoFocus
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar e Adicionar Clips'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
                setNewDesc('');
              }}
              className="px-4 py-2 border border-border hover:bg-surface-hover text-text rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {voices.length === 0 && !showCreate ? (
        <div className="text-center py-16 space-y-4">
          <Mic className="w-12 h-12 mx-auto text-text-muted" />
          <p className="text-text-muted">Nenhuma voz criada ainda.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-accent hover:text-accent-hover text-sm font-medium"
          >
            Criar sua primeira voz
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between hover:border-border-hover transition-colors"
            >
              <div className="space-y-1">
                <Link
                  to={`/voices/${voice.id}`}
                  className="text-lg font-semibold hover:text-accent transition-colors"
                >
                  {voice.name}
                </Link>
                {voice.description && (
                  <p className="text-sm text-text-muted">{voice.description}</p>
                )}
                <p className="text-xs text-text-muted">
                  {voice.clip_count} clip{voice.clip_count !== 1 ? 's' : ''} ·{' '}
                  {new Date(voice.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {voice.clip_count > 0 && (
                  <Link
                    to={`/generate?voice=${voice.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <AudioLines className="w-3.5 h-3.5" />
                    Usar
                  </Link>
                )}
                <Link
                  to={`/voices/${voice.id}`}
                  className="p-2 text-text-muted hover:text-text transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(voice.id, voice.name)}
                  className="p-2 text-text-muted hover:text-danger transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
