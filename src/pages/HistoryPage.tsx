import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import { listAnalyses, deleteAnalysis } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const VISIBLE = 2;
const MAX = 20;

const sourceIcon: Record<string, string> = {
  pdf:'📄', xlsx:'📊', csv:'📋', xml:'🗃️',
  url:'🌐', db:'🗄️', image:'🖼️', audio:'🎙️',
  video:'🎬', nextcloud:'☁️',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    listAnalyses(user.id, MAX).then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Remover esta análise?')) return;
    await deleteAnalysis(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const visible = items.slice(0, VISIBLE);
  const hidden  = items.slice(VISIBLE);

  if (loading) return <div className="page-loading">Carregando histórico...</div>;

  return (
    <div>
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={20} style={{ color:'var(--gold)' }}/> Histórico de análises
          </h1>
          <p>{items.length} análise{items.length !== 1 ? 's' : ''} · últimas {MAX} salvas</p>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
          <div style={{ fontFamily:'var(--serif)', fontSize:18, color:'var(--t1)', marginBottom:6 }}>Nenhuma análise ainda</div>
          <div style={{ fontSize:12.5, color:'var(--t2)', marginBottom:20 }}>Importe seu primeiro documento para começar</div>
          <button onClick={() => navigate('/import')} className="btn-solid" style={{ height:36, padding:'0 20px' }}>
            Importar dados
          </button>
        </div>
      )}

      {/* First 2 — always visible */}
      {visible.map((item, i) => (
        <HistoryCard key={item.id} item={item} index={i} onOpen={() => navigate(`/dashboard/${item.id}`)} onDelete={handleDelete} featured/>
      ))}

      {/* Expand section */}
      {hidden.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setExpanded(v => !v)} style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            background:'var(--surface-1)', border:'1px solid var(--line-1)',
            borderRadius:'var(--r12)', padding:'11px', cursor:'pointer',
            fontSize:12.5, color:'var(--t2)', fontFamily:'var(--sans)',
            transition:'all .14s', marginBottom: expanded ? 8 : 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,.25)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-1)')}>
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            {expanded
              ? `Ocultar análises antigas`
              : `Ver mais ${hidden.length} análise${hidden.length !== 1 ? 's' : ''} anteriore${hidden.length !== 1 ? 's' : ''}`}
          </button>

          {expanded && (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {hidden.map((item, i) => (
                <HistoryCard key={item.id} item={item} index={i + VISIBLE} onOpen={() => navigate(`/dashboard/${item.id}`)} onDelete={handleDelete} featured={false}/>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item, index, onOpen, onDelete, featured }: {
  item: any; index: number;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  featured: boolean;
}) {
  const date = new Date(item.created_at);
  const isToday = new Date().toDateString() === date.toDateString();
  const dateStr = isToday
    ? `Hoje às ${date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`
    : date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div onClick={onOpen} style={{
      display:'flex', alignItems:'center', gap:14,
      background: featured ? 'var(--surface-1)' : 'var(--surface-0)',
      border: `1px solid ${featured ? 'var(--line-2)' : 'var(--line-1)'}`,
      borderRadius:'var(--r12)',
      padding: featured ? '16px 20px' : '12px 16px',
      cursor:'pointer', transition:'all .15s',
      marginBottom: featured ? 10 : 0,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(59,130,246,.28)';
      e.currentTarget.style.boxShadow = '0 0 16px rgba(59,130,246,0.06)';
      e.currentTarget.style.transform = 'translateX(2px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = featured ? 'var(--line-2)' : 'var(--line-1)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateX(0)';
    }}>

      {/* Rank */}
      <div style={{ fontFamily:'var(--num)', fontSize: featured ? 28 : 18, color:'var(--t3)', width: featured ? 36 : 28, flexShrink:0, lineHeight:1 }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Icon */}
      <div style={{ fontSize: featured ? 24 : 18, flexShrink:0 }}>
        {sourceIcon[item.source_type] || '📁'}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize: featured ? 14 : 12.5, fontWeight:500, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize:11, color:'var(--t3)', marginTop:3, display:'flex', alignItems:'center', gap:8 }}>
          <span>{item.source_name || item.source_type}</span>
          <span>·</span>
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
        {item.is_public && (
          <span className="pill pill-up" style={{ fontSize:9.5 }}>Público</span>
        )}
        {item.telegram_sent && (
          <span className="pill pill-tele" style={{ fontSize:9.5 }}>Telegram</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:4, flexShrink:0 }} onClick={e => e.stopPropagation()}>
        {item.is_public && (
          <a href={`/public/${item.public_token}`} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Ver link público">
            <ExternalLink size={13}/>
          </a>
        )}
        <button onClick={e => onDelete(e, item.id)} className="icon-btn danger" title="Remover">
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
}
