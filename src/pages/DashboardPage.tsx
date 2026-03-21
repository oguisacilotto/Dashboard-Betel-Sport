import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Share2, Send, Download, ChevronDown, ChevronUp,
  Edit2, Check, X, Copy, ExternalLink
} from 'lucide-react';
import { getAnalysis, updateAnalysis, togglePublic, addShareRecord } from '../lib/supabase';
import { sendTelegramReport, captureAndSendTelegram } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { Analysis, Insight, ChartConfig } from '../types';
import { jsPDF } from 'jspdf';

const CHART_COLORS = ['#d4a853', '#3ecf8e', '#7c8ef0', '#e0943a', '#f26b6b', '#22d3ee', '#a78bfa', '#fb923c'];

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

  useEffect(() => {
    const load = async () => {
      if (id) {
        const a = await getAnalysis(id);
        setAnalysis(a);
      }
      setLoading(false);
    };
    load();
  }, [id, token]);

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
        <div className="section-label">10 Principais Insights</div>
        <div className="insights-grid">
          {analysis.insights.map(ins => (
            <div key={ins.id} className="insight-card">
              <div className="insight-head">
                <div className="insight-num">{String(ins.id).padStart(2, '0')}</div>
                <div className="insight-category">{ins.category}</div>
                {!readOnly && (
                  <button className="insight-edit-btn" onClick={() => { setEditingInsight(ins.id); setEditBuf(ins.description); }}>
                    <Edit2 size={11} />
                  </button>
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
