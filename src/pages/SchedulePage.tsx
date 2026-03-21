import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Send, Save, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const CRON_OPTIONS = [
  { label: 'Toda segunda às 8h',    value: '0 8 * * 1' },
  { label: 'Todo dia às 8h',        value: '0 8 * * *' },
  { label: 'Todo dia às 18h',       value: '0 18 * * *' },
  { label: 'Toda sexta às 17h',     value: '0 17 * * 5' },
  { label: 'Toda semana (seg 8h)',   value: '0 8 * * 1' },
  { label: 'Todo dia 1 às 8h',      value: '0 8 1 * *' },
  { label: 'Toda quinzena',         value: '0 8 1,15 * *' },
];

const TEMPLATES = [
  { id: 'geral',      label: 'Análise Geral',         desc: 'Insights abrangentes sobre todo o conteúdo' },
  { id: 'financeiro', label: 'Relatório Financeiro',  desc: 'Foco em receitas, despesas, margens e fluxo' },
  { id: 'vendas',     label: 'Performance de Vendas', desc: 'Metas, conversão, produtos e regiões' },
  { id: 'equipe',     label: 'Performance de Equipe', desc: 'Produtividade, metas e indicadores de RH' },
  { id: 'operacional',label: 'Operacional',           desc: 'Processos, eficiência e indicadores operacionais' },
];

export default function SchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // Form state
  const [name, setName]           = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [template, setTemplate]   = useState('geral');
  const [cronExpr, setCronExpr]   = useState('0 8 * * 1');
  const [cronLabel, setCronLabel] = useState('Toda segunda às 8h');
  const [tgNotify, setTgNotify]   = useState(true);

  const [toast, setToast] = useState('');
  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchSchedules = async () => {
    if (!user) return;
    const { data } = await supabase.from('schedules').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setSchedules(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, [user]);

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sourcePath) { notify('Preencha nome e caminho do arquivo'); return; }
    setSaving(true);
    const { error } = await supabase.from('schedules').insert({
      user_id: user!.id, name, source_path: sourcePath,
      source_type: 'nextcloud', template, cron_expr: cronExpr,
      cron_label: cronLabel, telegram_notify: tgNotify,
      next_run: getNextRun(cronExpr),
    });
    setSaving(false);
    if (error) { notify('Erro ao salvar: ' + error.message); return; }
    notify('Agendamento criado com sucesso!');
    setShowForm(false);
    setName(''); setSourcePath(''); setTemplate('geral');
    fetchSchedules();
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    await supabase.from('schedules').update({ enabled: !enabled }).eq('id', id);
    fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Remover este agendamento?')) return;
    await supabase.from('schedules').delete().eq('id', id);
    fetchSchedules();
  };

  const runNow = async (s: any) => {
    notify('Executando análise agora...');
    try {
      const r = await fetch('/api/schedule/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: s.id }),
      });
      const d = await r.json();
      if (r.ok) notify('Análise executada e enviada ao Telegram!');
      else notify('Erro: ' + d.message);
    } catch { notify('Erro ao executar'); }
  };

  const inp: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r8)', padding: '9px 12px', color: 'var(--t1)',
    fontSize: 12.5, outline: 'none', width: '100%', fontFamily: 'var(--sans)',
  };

  return (
    <div>
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={20} style={{ color:'var(--gold)' }}/> Agendamentos automáticos
          </h1>
          <p>Relatórios gerados e enviados no Telegram automaticamente</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-solid" style={{ height:36, padding:'0 16px', display:'flex', alignItems:'center', gap:6, fontSize:12.5 }}>
          {showForm ? <><X size={13}/> Cancelar</> : <><Plus size={13}/> Novo agendamento</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background:'var(--surface-1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'var(--r16)', padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:'var(--serif)', fontSize:16, color:'var(--t1)', marginBottom:20, paddingBottom:14, borderBottom:'1px solid var(--line-1)' }}>
            Novo agendamento
          </div>
          <form onSubmit={saveSchedule} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="field-group">
                <label>Nome do agendamento</label>
                <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Relatório semanal de vendas"/>
              </div>
              <div className="field-group">
                <label>Frequência</label>
                <select style={{ ...inp, appearance:'none' }} value={cronExpr} onChange={e => {
                  setCronExpr(e.target.value);
                  setCronLabel(CRON_OPTIONS.find(o => o.value === e.target.value)?.label || e.target.value);
                }}>
                  {CRON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label>Caminho do arquivo no Nextcloud</label>
              <input style={inp} value={sourcePath} onChange={e=>setSourcePath(e.target.value)} placeholder="/Relatórios/vendas-mensal.xlsx"/>
              <span className="field-hint">Caminho relativo dentro do seu Nextcloud em drive.betelsport.com.br</span>
            </div>
            <div className="field-group">
              <label>Template de análise</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8 }}>
                {TEMPLATES.map(t => (
                  <button type="button" key={t.id} onClick={() => setTemplate(t.id)} style={{
                    padding:'10px 8px', borderRadius:'var(--r8)', textAlign:'left',
                    background: template === t.id ? 'var(--gold-dim)' : 'var(--surface-2)',
                    border: `1px solid ${template === t.id ? 'rgba(59,130,246,.3)' : 'var(--line-1)'}`,
                    cursor:'pointer', transition:'all .14s',
                  }}>
                    <div style={{ fontSize:11.5, fontWeight:600, color: template === t.id ? '#60a5fa' : 'var(--t1)', marginBottom:3 }}>{t.label}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', lineHeight:1.3 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface-2)', border:'1px solid var(--line-1)', borderRadius:'var(--r8)', padding:'12px 16px' }}>
              <div>
                <div style={{ fontSize:12.5, fontWeight:500, color:'var(--t1)' }}>Notificar no Telegram após cada execução</div>
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>Insights e KPIs enviados automaticamente</div>
              </div>
              <button type="button" onClick={() => setTgNotify(v=>!v)} style={{ width:36, height:20, borderRadius:10, background: tgNotify ? 'linear-gradient(90deg,#3b82f6,#06b6d4)' : 'var(--line-2)', border:'none', cursor:'pointer', position:'relative', flexShrink:0 }}>
                <span style={{ position:'absolute', top:2, left: tgNotify ? 17 : 2, width:16, height:16, background:'#fff', borderRadius:'50%', transition:'left .2s', display:'block' }}/>
              </button>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={saving} className="btn-solid" style={{ height:38, padding:'0 20px', display:'flex', alignItems:'center', gap:6, fontSize:12.5 }}>
                <Save size={13}/> {saving ? 'Salvando...' : 'Salvar agendamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule list */}
      {loading && <div className="page-loading">Carregando...</div>}
      {!loading && schedules.length === 0 && !showForm && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <Clock size={40} style={{ opacity:.3, marginBottom:12, color:'var(--t3)' }}/>
          <div style={{ fontFamily:'var(--serif)', fontSize:18, color:'var(--t2)', marginBottom:6 }}>Nenhum agendamento</div>
          <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:20 }}>Crie um agendamento para receber relatórios automáticos no Telegram</div>
          <button onClick={() => setShowForm(true)} className="btn-solid" style={{ height:36, padding:'0 20px' }}>Criar primeiro agendamento</button>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {schedules.map(s => (
          <div key={s.id} style={{ background:'var(--surface-1)', border:`1px solid ${s.enabled ? 'var(--line-2)' : 'var(--line-1)'}`, borderRadius:'var(--r16)', padding:'16px 20px', display:'flex', alignItems:'center', gap:14, opacity: s.enabled ? 1 : .6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: s.enabled ? 'var(--up)' : 'var(--t3)', boxShadow: s.enabled ? '0 0 8px var(--up)' : 'none', flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{s.name}</div>
              <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--t3)' }}>
                <span>⏰ {s.cron_label}</span>
                <span>📁 {s.source_path}</span>
                <span>🎯 {TEMPLATES.find(t => t.id === s.template)?.label || s.template}</span>
                {s.last_run && <span>✓ {new Date(s.last_run).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              {s.telegram_notify && <span className="pill pill-tele" style={{ fontSize:10 }}>Telegram</span>}
              <button onClick={() => runNow(s)} title="Executar agora" className="btn-outline" style={{ height:30, padding:'0 10px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                <Send size={11}/> Executar
              </button>
              <button onClick={() => toggleSchedule(s.id, s.enabled)} title={s.enabled ? 'Pausar' : 'Ativar'} className="icon-btn" style={{ color: s.enabled ? 'var(--up)' : 'var(--t3)' }}>
                {s.enabled ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
              </button>
              <button onClick={() => deleteSchedule(s.id)} className="icon-btn danger"><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'var(--surface-3)', border:'1px solid var(--line-2)', borderRadius:'var(--r12)', padding:'12px 16px', fontSize:12.5, color:'var(--t1)', zIndex:99, boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function getNextRun(cron: string): string {
  // Simple approximation — next Monday 8h
  const now = new Date();
  now.setDate(now.getDate() + 7);
  return now.toISOString();
}
