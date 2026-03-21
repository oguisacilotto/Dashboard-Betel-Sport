// ═══════════════════════════════════════════════════
// HistoryPage.tsx
// ═══════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Share2, ExternalLink } from 'lucide-react';
import { listAnalyses, deleteAnalysis } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listAnalyses(user.id).then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta análise?')) return;
    await deleteAnalysis(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const sourceIcon = (type: string) => {
    const map: Record<string, string> = {
      pdf: '📄', xlsx: '📊', csv: '📋', xml: '🗃️',
      url: '🌐', db: '🗄️', image: '🖼️', audio: '🎙️', video: '🎬', nextcloud: '☁️',
    };
    return map[type] || '📁';
  };

  if (loading) return <div className="page-loading">Carregando histórico...</div>;

  return (
    <div className="history-page">
      <div className="page-head">
        <h1>Histórico de análises</h1>
        <p>{items.length} análise{items.length !== 1 ? 's' : ''} encontrada{items.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="history-list">
        {items.length === 0 && (
          <div className="empty-state">Nenhuma análise ainda. Importe sua primeira fonte de dados.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="history-item" onClick={() => navigate(`/dashboard/${item.id}`)}>
            <div className="history-icon">{sourceIcon(item.source_type)}</div>
            <div className="history-body">
              <div className="history-name">{item.title}</div>
              <div className="history-meta">
                {item.source_name} · {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className="history-badges">
              {item.is_public && <span className="pill pill-up">Público</span>}
              {item.telegram_sent && <span className="pill pill-tele">Telegram</span>}
            </div>
            <div className="history-actions" onClick={e => e.stopPropagation()}>
              {item.is_public && (
                <a href={`/public/${item.public_token}`} target="_blank" rel="noopener noreferrer" className="icon-btn">
                  <ExternalLink size={13} />
                </a>
              )}
              <button className="icon-btn danger" onClick={() => handleDelete(item.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
