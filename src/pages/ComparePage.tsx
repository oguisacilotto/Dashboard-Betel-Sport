import { useState, useEffect } from 'react';
import { GitCompare, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { listAnalyses } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function ComparePage() {
  const { user } = useAuth();
  const [allAnalyses, setAll] = useState<any[]>([]);
  const [leftId, setLeftId]   = useState('');
  const [rightId, setRightId] = useState('');
  const [left, setLeft]       = useState<any>(null);
  const [right, setRight]     = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    listAnalyses(user.id, 20).then(({ data }) => setAll(data || []));
  }, [user]);

  useEffect(() => {
    setLeft(allAnalyses.find(a => a.id === leftId) || null);
  }, [leftId, allAnalyses]);

  useEffect(() => {
    setRight(allAnalyses.find(a => a.id === rightId) || null);
  }, [rightId, allAnalyses]);

  const sel: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r8)', padding: '9px 12px', color: 'var(--t1)',
    fontSize: 12.5, outline: 'none', width: '100%', fontFamily: 'var(--sans)',
    appearance: 'none', cursor: 'pointer',
  };

  const deltaColor = (v1: number, v2: number) =>
    v1 > v2 ? 'var(--up)' : v1 < v2 ? 'var(--down)' : 'var(--t3)';

  const deltaIcon = (v1: number, v2: number) =>
    v1 > v2 ? <TrendingUp size={12}/> : v1 < v2 ? <TrendingDown size={12}/> : <Minus size={12}/>;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
          <GitCompare size={20} style={{ color:'var(--gold)' }}/> Comparador de análises
        </h1>
        <p>Selecione duas análises para comparar KPIs e insights lado a lado</p>
      </div>

      {/* Selectors */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Análise A</div>
          <select style={sel} value={leftId} onChange={e => setLeftId(e.target.value)}>
            <option value="">Selecione uma análise...</option>
            {allAnalyses.filter(a => a.id !== rightId).map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginTop:18 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--gold-dim)', border:'1px solid rgba(59,130,246,.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GitCompare size={16} style={{ color:'var(--gold)' }}/>
          </div>
        </div>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Análise B</div>
          <select style={sel} value={rightId} onChange={e => setRightId(e.target.value)}>
            <option value="">Selecione uma análise...</option>
            {allAnalyses.filter(a => a.id !== leftId).map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
      </div>

      {(!left || !right) && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
          <GitCompare size={40} style={{ opacity:.3, marginBottom:12 }}/>
          <div style={{ fontFamily:'var(--serif)', fontSize:18, marginBottom:6, color:'var(--t2)' }}>Selecione duas análises</div>
          <div style={{ fontSize:12.5 }}>Os KPIs e insights serão comparados automaticamente</div>
        </div>
      )}

      {left && right && (
        <>
          {/* KPI Comparison */}
          <div className="section-label" style={{ marginBottom:12 }}>Comparativo de KPIs</div>
          <div style={{ background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', overflow:'hidden', marginBottom:20 }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', background:'var(--surface-2)', borderBottom:'1px solid var(--line-1)' }}>
              <div style={{ padding:'12px 16px', fontSize:12, fontWeight:600, color:'#60a5fa' }}>{left.title.slice(0,40)}…</div>
              <div style={{ padding:'12px 16px', fontSize:11, color:'var(--t3)', textAlign:'center', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>Métrica</div>
              <div style={{ padding:'12px 16px', fontSize:12, fontWeight:600, color:'#a78bfa', textAlign:'right' }}>{right.title.slice(0,40)}…</div>
            </div>
            {/* KPI rows - align by label */}
            {(() => {
              const lkpis: any[] = left.kpis || [];
              const rkpis: any[] = right.kpis || [];
              const allLabels = [...new Set([...lkpis.map((k:any) => k.label), ...rkpis.map((k:any) => k.label)])];
              return allLabels.map(label => {
                const lk = lkpis.find((k:any) => k.label === label);
                const rk = rkpis.find((k:any) => k.label === label);
                const lv = lk?.rawValue || 0;
                const rv = rk?.rawValue || 0;
                return (
                  <div key={label} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid var(--line-1)', alignItems:'center' }}>
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ fontFamily:'var(--num)', fontSize:28, color: lv >= rv ? 'var(--up)' : 'var(--down)', lineHeight:1 }}>{lk?.value || '—'}</div>
                      {lk?.delta && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginTop:4 }}>{lk.delta}</div>}
                    </div>
                    <div style={{ padding:'14px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--t3)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, color: deltaColor(lv, rv), fontSize:11 }}>
                        {deltaIcon(lv, rv)}
                        {lv !== rv && (
                          <span style={{ fontFamily:'var(--mono)' }}>
                            {lv > rv ? '+' : ''}{rv !== 0 ? ((lv - rv) / rv * 100).toFixed(1) : '—'}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding:'14px 16px', textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--num)', fontSize:28, color: rv >= lv ? 'var(--up)' : 'var(--down)', lineHeight:1 }}>{rk?.value || '—'}</div>
                      {rk?.delta && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginTop:4 }}>{rk.delta}</div>}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Insights comparison */}
          <div className="section-label" style={{ marginBottom:12 }}>Comparativo de insights</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[left, right].map((analysis, side) => (
              <div key={side}>
                <div style={{ fontSize:12, fontWeight:600, color: side === 0 ? '#60a5fa' : '#a78bfa', marginBottom:8, padding:'0 2px' }}>
                  {analysis.title.slice(0, 50)}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(analysis.insights || []).slice(0,5).map((ins: any) => (
                    <div key={ins.id} style={{ background:'var(--surface-1)', border:`1px solid ${side === 0 ? 'rgba(59,130,246,.12)' : 'rgba(139,92,246,.12)'}`, borderRadius:'var(--r12)', padding:'12px 14px' }}>
                      <div style={{ fontSize:10, fontWeight:600, color: side === 0 ? '#60a5fa' : '#a78bfa', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:4 }}>
                        #{ins.id} · {ins.category}
                      </div>
                      <div style={{ fontSize:12.5, fontWeight:500, color:'var(--t1)', marginBottom:4 }}>{ins.title}</div>
                      <div style={{ fontSize:11.5, color:'var(--t2)', lineHeight:1.5 }}>{ins.description?.slice(0,120)}…</div>
                      {ins.value && (
                        <div style={{ fontFamily:'var(--num)', fontSize:18, color: ins.trend === 'up' ? 'var(--up)' : ins.trend === 'down' ? 'var(--down)' : 'var(--warn)', marginTop:6 }}>
                          {ins.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
