import { useState, useEffect } from 'react';
import { BarChart2, Users, FileText, Send, TrendingUp, Clock } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Carregando métricas...</div>;
  if (!stats) return <div className="page-error">Erro ao carregar métricas</div>;

  const sourceColors: Record<string, string> = {
    pdf: '#3b82f6', xlsx: '#10b981', csv: '#f59e0b',
    url: '#8b5cf6', xml: '#06b6d4', image: '#f43f5e',
    db: '#fb923c', nextcloud: '#22d3ee',
  };

  return (
    <div>
      <div className="page-head">
        <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
          <BarChart2 size={20} style={{ color:'var(--gold)' }}/> Métricas de uso
        </h1>
        <p>Visão geral do sistema — análises, usuários e fontes mais usadas</p>
      </div>

      {/* Big KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:1, background:'var(--line-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', overflow:'hidden', marginBottom:20 }}>
        {[
          { icon: <Users size={18}/>,    label:'Usuários ativos',     value: stats.total_users,    color:'#3b82f6' },
          { icon: <FileText size={18}/>, label:'Total de análises',   value: stats.total_analyses, color:'#10b981' },
          { icon: <Send size={18}/>,     label:'Enviados Telegram',   value: stats.telegram_sent,  color:'#8b5cf6' },
          { icon: <TrendingUp size={18}/>,label:'Públicos',          value: stats.public_analyses, color:'#f59e0b' },
        ].map((k, i) => (
          <div key={i} style={{ background:'var(--surface-1)', padding:'20px 22px' }}>
            <div style={{ color: k.color, marginBottom:10, opacity:.8 }}>{k.icon}</div>
            <div style={{ fontFamily:'var(--num)', fontSize:42, color:'var(--t1)', lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:6, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        {/* Source types */}
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', padding:20 }}>
          <div style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--t1)', marginBottom:16 }}>Fontes mais utilizadas</div>
          {(stats.by_source || []).map((s: any) => {
            const pct = stats.total_analyses > 0 ? (s.count / stats.total_analyses) * 100 : 0;
            return (
              <div key={s.source_type} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12.5, color:'var(--t1)', fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: sourceColors[s.source_type] || 'var(--t3)', display:'inline-block' }}/>
                    {s.source_type.toUpperCase()}
                  </span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)' }}>{s.count} · {pct.toFixed(0)}%</span>
                </div>
                <div style={{ height:4, background:'var(--surface-3)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: sourceColors[s.source_type] || 'var(--gold)', borderRadius:2, transition:'width .6s ease' }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Per user */}
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', padding:20 }}>
          <div style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--t1)', marginBottom:16 }}>Análises por usuário</div>
          {(stats.by_user || []).map((u: any, i: number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--line-1)' }}>
              <div className="user-avatar" style={{ width:32, height:32, fontSize:13, flexShrink:0 }}>
                {(u.name || u.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:500, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name || u.email}</div>
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>
                  {u.analyses_count} análise{u.analyses_count !== 1 ? 's' : ''}
                  {u.last_analysis && ` · último: ${new Date(u.last_analysis).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <div style={{ fontFamily:'var(--num)', fontSize:24, color:'var(--gold)', flexShrink:0 }}>{u.analyses_count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity timeline */}
      <div style={{ background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', padding:20 }}>
        <div style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--t1)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={15} style={{ color:'var(--gold)' }}/> Análises recentes
        </div>
        {(stats.recent || []).map((a: any) => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--line-1)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: sourceColors[a.source_type] || 'var(--t3)', flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>{a.user_name || a.user_email} · {a.source_type.toUpperCase()}</div>
            </div>
            <div style={{ fontSize:11, color:'var(--t3)', flexShrink:0, fontFamily:'var(--mono)' }}>
              {new Date(a.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
