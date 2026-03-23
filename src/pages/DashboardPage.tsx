import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Share2, Send, Download, ChevronDown, ChevronUp,
  Edit2, Check, X, Copy, ExternalLink,
  RefreshCw, Sparkles, Loader, MessageCircle, Trash2
} from 'lucide-react';
import { getAnalysis, getAnalysisByToken, updateAnalysis, togglePublic, addShareRecord } from '../lib/supabase';
import { sendTelegramReport, captureAndSendTelegram } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { Analysis, Insight, ChartConfig } from '../types';
import { jsPDF } from 'jspdf';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#f43f5e', '#22d3ee', '#fb923c'];

function renderChart(cfg: ChartConfig) {
  const data = cfg.data[0]?.labels.map((label, i) => ({
    name: label,
    ...Object.fromEntries(cfg.data.map(d => [d.label, d.values[i] ?? 0])),
  })) ?? [];

  const common = { data, margin: { top: 5, right: 10, left: 0, bottom: 5 } };
  const tooltipStyle = { backgroundColor: '#1b1b22', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8 };

  switch (cfg.type) {
    case 'bar':
      return (
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {cfg.data.map((d, i) => <Bar key={d.label} dataKey={d.label} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      );
    case 'line':
      return (
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {cfg.data.map((d, i) => (
            <Line key={d.label} type="monotone" dataKey={d.label} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i] }} />
          ))}
        </LineChart>
      );
    case 'area':
      return (
        <AreaChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#4e4d52', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {cfg.data.map((d, i) => (
            <Area key={d.label} type="monotone" dataKey={d.label} stroke={CHART_COLORS[i]}
              fill={`${CHART_COLORS[i]}18`} strokeWidth={2} />
          ))}
        </AreaChart>
      );
    case 'pie':
    case 'donut':
      return (
        <PieChart>
          <Pie data={data} dataKey={cfg.data[0]?.label} nameKey="name"
            cx="50%" cy="50%" outerRadius={80} innerRadius={cfg.type === 'donut' ? 45 : 0}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8b8990' }} />
        </PieChart>
      );
    default:
      return <BarChart {...common}><Bar dataKey={cfg.data[0]?.label || 'value'} fill={CHART_COLORS[0]} /></BarChart>;
  }
}

export default function DashboardPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id, token } = useParams();
  const { user } = useAuth();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editingInsight, setEditingInsight] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [focusInsight, setFocusInsight] = useState<number | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [openComments, setOpenComments] = useState<number|null>(null);
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        let a = null;
        if (token) {
          // Public shared view — load by token
          a = await getAnalysisByToken(token);
        } else if (id) {
          // Private view — load by ID
          a = await getAnalysis(id);
        }
        setAnalysis(a);
      } catch {
        setAnalysis(null);
      }
      setLoading(false);
    };
    load();
  }, [id, token]);

  const loadComments = async (insightId: number) => {
    if (!analysis) return;
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await sb.from('insight_comments')
      .select('*').eq('analysis_id', analysis.id).eq('insight_id', insightId)
      .order('created_at', { ascending: true });
    setComments(prev => ({ ...prev, [insightId]: data || [] }));
  };

  const toggleComments = async (insightId: number) => {
    if (openComments === insightId) { setOpenComments(null); return; }
    setOpenComments(insightId);
    await loadComments(insightId);
  };

  const addComment = async (insightId: number) => {
    if (!commentText.trim() || !analysis || !user) return;
    setSavingComment(true);
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    const { data: profile } = await sb.from('profiles').select('name').eq('id', user.id).single();
    await sb.from('insight_comments').insert({
      analysis_id: analysis.id, insight_id: insightId,
      user_id: user.id, author_name: profile?.name || user.email,
      content: commentText.trim(),
    });
    setCommentText('');
    await loadComments(insightId);
    setSavingComment(false);
  };

  const deleteComment = async (commentId: string, insightId: number) => {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    await sb.from('insight_comments').delete().eq('id', commentId);
    await loadComments(insightId);
  };

  // ── Regenerate all 10 insights ───────────────────
  const handleRegenerate = async () => {
    if (!analysis || regenerating) return;
    setRegenerating(true);
    showToast('Regenerando análise com IA...');
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: analysis.source_type,
          text: analysis.raw_text || analysis.title,
        }),
      });
      if (!r.ok) throw new Error('Erro ao regenerar');
      const result = await r.json();
      const updated = {
        ...analysis,
        insights: result.insights,
        charts_config: result.charts,
        kpis: result.kpis,
      };
      setAnalysis(updated as any);
      await updateAnalysis(analysis.id, {
        insights: result.insights as any,
        charts_config: result.charts as any,
        kpis: result.kpis as any,
      });
      showToast('Análise regenerada com sucesso!');
    } catch {
      showToast('Erro ao regenerar. Tente novamente.');
    } finally {
      setRegenerating(false);
    }
  };

  // ── Generate focused dashboard from one insight ───
  const handleFocusDashboard = async (ins: any) => {
    if (!analysis || focusLoading) return;
    setFocusInsight(ins.id);
    setFocusLoading(true);
    try {
      const focusPrompt = `Foco exclusivo no tópico: "${ins.title}". 
Descrição: ${ins.description}. 
${ins.value ? `Valor: ${ins.value}.` : ''}
Contexto do documento original: ${analysis.title}.
Raw text: ${analysis.raw_text?.slice(0, 30000) || ''}`;

      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: analysis.source_type,
          text: focusPrompt,
        }),
      });
      if (!r.ok) throw new Error('Erro ao gerar dashboard focado');
      const result = await r.json();

      // Save as new analysis
      const { data: saved } = await import('../lib/supabase').then(m =>
        m.createAnalysis({
          user_id: user!.id,
          title: `${ins.title} — Análise detalhada`,
          source_type: analysis.source_type,
          source_name: analysis.source_name,
          raw_text: analysis.raw_text,
          insights: result.insights as any,
          charts_config: result.charts as any,
          kpis: result.kpis as any,
          telegram_enabled: false,
        })
      );

      if (saved?.id) {
        window.open(`/dashboard/${saved.id}`, '_blank');
        showToast('Dashboard focado criado! Abrindo em nova aba...');
      }
    } catch {
      showToast('Erro ao gerar dashboard focado.');
    } finally {
      setFocusInsight(null);
      setFocusLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveInsightEdit = async (insightId: number) => {
    if (!analysis) return;
    const updated = analysis.insights.map(ins =>
      ins.id === insightId ? { ...ins, description: editBuf } : ins
    );
    setAnalysis({ ...analysis, insights: updated });
    await updateAnalysis(analysis.id, { insights: updated as any });
    setEditingInsight(null);
  };

  const handleShare = async () => {
    if (!analysis) return;
    if (!analysis.is_public) {
      await togglePublic(analysis.id, true);
      setAnalysis({ ...analysis, is_public: true });
    }
    const url = `${window.location.origin}/public/${analysis.public_token}`;
    setShareUrl(url);
    setShowShareModal(true);
    await addShareRecord({ analysis_id: analysis.id, user_id: user!.id, channel: 'public_link' });
  };

  const handleTelegram = async () => {
    if (!analysis) return;
    await captureAndSendTelegram('dashboard-capture', analysis.id);
    await sendTelegramReport({ analysis_id: analysis.id, include_screenshot: true, include_kpis: true, include_insights: true, include_pdf: false });
    showToast('Relatório enviado ao Telegram!');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(analysis?.title || 'Dashboard', 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Betel Sport`, 20, 28);
    let y = 40;
    analysis?.insights.forEach((ins, i) => {
      if (y > 180) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${ins.id}. ${ins.title}`, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(ins.description, 20, y + 6, { maxWidth: 250 });
      y += 20;
    });
    doc.save(`betel-dashboard-${Date.now()}.pdf`);
  };

  if (loading) return <div className="page-loading">Carregando análise...</div>;
  if (!analysis) return <div className="page-error">Análise não encontrada</div>;

  const visibleCharts  = analysis.charts_config.filter(c => c.visible);
  const hiddenCharts   = analysis.charts_config.filter(c => !c.visible);
  const trendIcon = (t?: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';

  return (
    <div className="dashboard-page" id="dashboard-capture" ref={dashboardRef}>

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{analysis.title}</h1>
          <div className="dash-meta">
            {analysis.source_name} · {new Date(analysis.created_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
        {!readOnly && (
          <div className="dash-actions">
            <button className="btn-outline" onClick={handleShare}><Share2 size={13} /> Compartilhar</button>
            <button className="btn-tele"    onClick={handleTelegram}><Send size={13} /> Telegram</button>
            <button className="btn-outline" onClick={handleExportPDF}><Download size={13} /> PDF</button>
          </div>
        )}
      </div>

      {/* KPIs */}
      {analysis.kpis?.length > 0 && (
        <div className="kpi-strip">
          {analysis.kpis.map((kpi, i) => (
            <div key={i} className={`kpi kpi-${['accent','purple','green','orange'][i % 4]}`}>
              <div className="kpi-tag">{kpi.label}</div>
              <div className="kpi-val">
                {kpi.unit && <sup>{kpi.unit}</sup>}
                {kpi.value}
              </div>
              {kpi.delta && (
                <div className="kpi-meta">
                  <span className={`kpi-delta ${kpi.deltaType}`}>{trendIcon(kpi.deltaType)} {kpi.delta}</span>
                </div>
              )}
              <div className="kpi-bar" />
            </div>
          ))}
        </div>
      )}

      {/* 4 visible charts */}
      <div className="charts-grid">
        {visibleCharts.map(chart => (
          <div key={chart.id} className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">{chart.title}</div>
                {chart.description && <div className="chart-sub">{chart.description}</div>}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              {renderChart(chart)}
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Expand 6 more */}
      {hiddenCharts.length > 0 && (
        <div className="expand-section">
          <button className="expand-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar gráficos adicionais' : `Ver mais ${hiddenCharts.length} gráficos`}
          </button>
          {expanded && (
            <div className="charts-grid" style={{ marginTop: 12 }}>
              {hiddenCharts.map(chart => (
                <div key={chart.id} className="chart-card">
                  <div className="chart-head">
                    <div className="chart-title">{chart.title}</div>
                    {chart.description && <div className="chart-sub">{chart.description}</div>}
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    {renderChart(chart)}
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10 Insights */}
      <div className="insights-section">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div className="section-label" style={{ marginBottom:0 }}>10 Principais Insights</div>
          {!readOnly && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                display:'flex', alignItems:'center', gap:6,
                background: regenerating ? 'var(--surface-3)' : 'var(--gold-dim)',
                border:'1px solid rgba(59,130,246,.22)',
                color: regenerating ? 'var(--t3)' : '#60a5fa',
                borderRadius:'var(--r8)', padding:'6px 12px',
                cursor: regenerating ? 'not-allowed' : 'pointer',
                fontSize:12, fontFamily:'var(--sans)',
                transition:'all .15s',
              }}
            >
              {regenerating
                ? <><Loader size={12} style={{ animation:'spin 1s linear infinite' }}/> Regenerando...</>
                : <><RefreshCw size={12}/> Gerar novamente</>}
            </button>
          )}
        </div>
        <div className="insights-grid">
          {analysis.insights.map(ins => (
            <div key={ins.id} className="insight-card" style={{ position:'relative' }}>
              <div className="insight-head">
                <div className="insight-num">{String(ins.id).padStart(2, '0')}</div>
                <div className="insight-category">{ins.category}</div>
                {!readOnly && (
                  <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
                    <button className="insight-edit-btn" title="Editar" onClick={(e) => { e.stopPropagation(); setEditingInsight(ins.id); setEditBuf(ins.description); }}>
                      <Edit2 size={11} />
                    </button>
                    <button
                      className="insight-edit-btn"
                      title="Gerar dashboard focado neste tópico"
                      disabled={focusLoading}
                      onClick={(e) => { e.stopPropagation(); handleFocusDashboard(ins); }}
                      style={{ opacity: focusLoading && focusInsight !== ins.id ? 0.3 : 1 }}
                    >
                      {focusInsight === ins.id
                        ? <Loader size={11} style={{ animation:'spin 1s linear infinite' }}/>
                        : <Sparkles size={11} />}
                    </button>
                  </div>
                )}
              </div>
              <div className="insight-title">{ins.title}</div>
              {editingInsight === ins.id ? (
                <div className="insight-edit">
                  <textarea value={editBuf} onChange={e => setEditBuf(e.target.value)} rows={3} />
                  <div className="insight-edit-actions">
                    <button onClick={() => saveInsightEdit(ins.id)}><Check size={12} /> Salvar</button>
                    <button onClick={() => setEditingInsight(null)}><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="insight-desc">{ins.description}</div>
              )}
              {ins.value && (
                <div className={`insight-value ${ins.trend}`}>
                  {trendIcon(ins.trend)} {ins.value} {ins.trendValue && <span>{ins.trendValue}</span>}
                </div>
              )}
              {/* Comments toggle */}
              {!readOnly && (
                <button
                  onClick={() => toggleComments(ins.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:5, marginTop:10,
                    background:'transparent', border:'none', color:'var(--t3)',
                    cursor:'pointer', fontSize:11, fontFamily:'var(--sans)', padding:0,
                    transition:'color .14s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
                >
                  <MessageCircle size={12}/>
                  {(comments[ins.id]?.length || 0) > 0 ? `${comments[ins.id].length} comentário${comments[ins.id].length !== 1 ? 's' : ''}` : 'Comentar'}
                </button>
              )}
              {/* Comments panel */}
              {openComments === ins.id && (
                <div style={{ marginTop:10, borderTop:'1px solid var(--line-1)', paddingTop:10 }}>
                  {(comments[ins.id] || []).map(cm => (
                    <div key={cm.id} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
                      <div className="user-avatar" style={{ width:22, height:22, fontSize:10, flexShrink:0 }}>
                        {(cm.author_name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--t2)', marginBottom:2 }}>{cm.author_name}</div>
                        <div style={{ fontSize:11.5, color:'var(--t1)', lineHeight:1.4 }}>{cm.content}</div>
                        <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{new Date(cm.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                      {cm.user_id === user?.id && (
                        <button onClick={() => deleteComment(cm.id, ins.id)} className="icon-btn danger" style={{ padding:2 }}><Trash2 size={10}/></button>
                      )}
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    <input
                      value={commentText} onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(ins.id); }}}
                      placeholder="Adicionar observação..."
                      style={{ flex:1, background:'var(--surface-3)', border:'1px solid var(--line-2)', borderRadius:6, padding:'6px 9px', color:'var(--t1)', fontSize:11.5, fontFamily:'var(--sans)', outline:'none' }}
                    />
                    <button onClick={() => addComment(ins.id)} disabled={savingComment || !commentText.trim()}
                      style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', borderRadius:6, padding:'0 10px', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'var(--sans)' }}>
                      {savingComment ? '...' : 'Ok'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Link público gerado</div>
            <div className="modal-sub">Qualquer pessoa com este link pode visualizar — sem login</div>
            <div className="share-url-row">
              <code className="share-url">{shareUrl}</code>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Link copiado!'); }}>
                <Copy size={14} />
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>
            </div>
            <button className="modal-close" onClick={() => setShowShareModal(false)}>Fechar</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
