import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, X, Upload, Clock, GitCompare,
  CalendarClock, Send, Shield, BarChart2, Settings,
  Sparkles, RefreshCw, MessageCircle, Play, CheckCircle
} from 'lucide-react';

interface TourStep {
  id: string;
  route: string;
  selector?: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: TourStep[] = [
  { id:'welcome', route:'/import', position:'center', icon:<Sparkles size={20}/>,
    title:'Bem-vindo à Central de Resultados',
    description:'Este tour vai te guiar por todas as funcionalidades em menos de 3 minutos. Use os botões abaixo para navegar — ou as setas do teclado ← →.' },
  { id:'import', route:'/import', selector:'.source-grid', position:'bottom', icon:<Upload size={20}/>,
    title:'Importar dados — 9 fontes',
    description:'Escolha de onde vêm seus dados: PDF, Excel, CSV, XML, URL, banco de dados, imagens, áudio ou Nextcloud. Clique na fonte desejada e o sistema configura automaticamente.' },
  { id:'telegram-toggle', route:'/import', selector:'.telegram-toggle', position:'top', icon:<Send size={20}/>,
    title:'Envio automático ao Telegram',
    description:'Este toggle controla se os resultados serão enviados ao Telegram após a análise. Desative para documentos confidenciais.' },
  { id:'history', route:'/history', selector:'.page-head', position:'bottom', icon:<Clock size={20}/>,
    title:'Histórico de análises',
    description:'As 2 análises mais recentes ficam sempre em destaque. Clique em "Ver mais" para expandir até 20. Clique em qualquer análise para abrir o dashboard completo.' },
  { id:'regenerate', route:'/history', position:'center', icon:<RefreshCw size={20}/>,
    title:'Regenerar e focar insights',
    description:'No dashboard, "Gerar novamente" pede ao Gemini uma nova análise. O ícone ✨ em cada insight gera um dashboard focado naquele tópico — abre em nova aba!' },
  { id:'comments', route:'/history', position:'center', icon:<MessageCircle size={20}/>,
    title:'Comentários nos insights',
    description:'Cada insight tem um botão "Comentar". Adicione observações, planos de ação ou contexto. Os comentários ficam salvos e visíveis para toda a equipe.' },
  { id:'compare', route:'/compare', selector:'.page-head', position:'bottom', icon:<GitCompare size={20}/>,
    title:'Comparador de análises',
    description:'Selecione duas análises e veja KPIs lado a lado com % de diferença. Setas verde/vermelho indicam qual está melhor em cada métrica.' },
  { id:'schedule', route:'/schedule', selector:'.page-head', position:'bottom', icon:<CalendarClock size={20}/>,
    title:'Agendamentos automáticos',
    description:'Configure relatórios que rodam sozinhos: arquivo do Nextcloud, frequência e template. O sistema analisa e envia o resumo no Telegram automaticamente.' },
  { id:'settings', route:'/settings', selector:'.page-head', position:'bottom', icon:<Settings size={20}/>,
    title:'Configurações',
    description:'Edite perfil, altere senha, configure Telegram com botão de teste e veja informações da sua conta. Tudo em 5 abas organizadas.' },
  { id:'admin', route:'/admin', selector:'.page-head', position:'bottom', icon:<Shield size={20}/>,
    title:'Painel do administrador',
    description:'Gerencie usuários: aprove solicitações, crie contas, redefina senhas, edite perfis e envie e-mails. O Telegram notifica cada nova solicitação.' },
  { id:'analytics', route:'/admin/analytics', selector:'.page-head', position:'bottom', icon:<BarChart2 size={20}/>,
    title:'Métricas de uso',
    description:'Total de análises, usuários ativos, envios Telegram e dashboards públicos. Gráfico de fontes mais usadas, ranking de usuários e timeline de atividade.' },
  { id:'finish', route:'/import', position:'center', icon:<CheckCircle size={20}/>,
    title:'Tour concluído! 🎉',
    description:'Agora você conhece todo o sistema. Comece importando um documento real da Betel Sport e veja a IA gerar insights em segundos. O botão ▶ está sempre disponível.' },
];

// Inject CSS to elevate the highlighted element above the overlay
function injectHighlightStyle(selector: string | undefined, zOverlay: number) {
  const id = 'tour-highlight-style';
  const old = document.getElementById(id);
  if (old) old.remove();
  if (!selector) return;
  const style = document.createElement('style');
  style.id = id;
  // Elevate element and remove blur on it
  style.textContent = `
    .tour-active ${selector} {
      position: relative !important;
      z-index: ${zOverlay + 1} !important;
      filter: none !important;
      backdrop-filter: none !important;
      border-radius: 12px;
      outline: 2px solid rgba(59,130,246,0.8);
      outline-offset: 6px;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.12), 0 0 32px rgba(59,130,246,0.25) !important;
      animation: tourElementGlow 2.5s ease-in-out infinite;
    }
    @keyframes tourElementGlow {
      0%,100% { outline-color: rgba(59,130,246,0.7); box-shadow: 0 0 0 6px rgba(59,130,246,0.10), 0 0 28px rgba(59,130,246,0.20) !important; }
      50%      { outline-color: rgba(59,130,246,1.0); box-shadow: 0 0 0 8px rgba(59,130,246,0.18), 0 0 48px rgba(59,130,246,0.45) !important; }
    }
  `;
  document.body.appendChild(style);
}

function removeHighlightStyle() {
  document.getElementById('tour-highlight-style')?.remove();
}

const OVERLAY_Z  = 60000;
const TOOLTIP_Z  = 60002;

function Tour({ onClose }: { onClose: () => void }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [step, setStep]   = useState(0);
  const [ready, setReady] = useState(false);
  const timer = useRef<any>(null);

  const cur     = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;
  const pct     = (step / (STEPS.length - 1)) * 100;

  const activate = useCallback(() => {
    setReady(false);
    removeHighlightStyle();
    document.body.classList.add('tour-active');

    if (location.pathname !== cur.route) navigate(cur.route);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      injectHighlightStyle(cur.selector, OVERLAY_Z);
      setReady(true);
    }, 420);
  }, [step]); // eslint-disable-line

  useEffect(() => {
    activate();
    return () => {
      clearTimeout(timer.current);
    };
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeHighlightStyle();
      document.body.classList.remove('tour-active');
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { if (isLast) { handleClose(); } else setStep(s => s + 1); }
      if (e.key === 'ArrowLeft') { if (!isFirst) setStep(s => s - 1); }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, isFirst, isLast]);

  const handleClose = () => {
    removeHighlightStyle();
    document.body.classList.remove('tour-active');
    onClose();
  };

  // Tooltip positioning — purely based on viewport, no spotlight needed
  const W = 400;
  const tipPos = (): React.CSSProperties => {
    if (!cur.selector || cur.position === 'center') {
      return { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:W };
    }
    const el = document.querySelector(cur.selector);
    if (!el) return { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:W };

    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const safe = (x: number) => Math.min(Math.max(x, 12), window.innerWidth - W - 12);
    const PAD  = 20;

    if (cur.position === 'bottom') return { position:'fixed', top: rect.bottom + PAD, left: safe(cx - W / 2), width:W };
    if (cur.position === 'top')    return { position:'fixed', bottom: window.innerHeight - rect.top + PAD, left: safe(cx - W / 2), width:W };
    if (cur.position === 'right')  return { position:'fixed', top: Math.max(rect.top, 16), left: rect.right + PAD, width:W };
    if (cur.position === 'left')   return { position:'fixed', top: Math.max(rect.top, 16), right: window.innerWidth - rect.left + PAD, width:W };
    return { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:W };
  };

  const btnBase: React.CSSProperties = {
    display:'flex', alignItems:'center', justifyContent:'center', gap:7,
    height:44, borderRadius:12, cursor:'pointer',
    fontSize:13.5, fontWeight:700, fontFamily:'var(--sans)',
    border:'none', transition:'all .15s',
  };

  return (
    <>
      {/* Dark overlay — does NOT blur, element handles its own elevation */}
      <div style={{
        position:'fixed', inset:0, zIndex: OVERLAY_Z,
        background:'rgba(4,6,8,0.78)',
        opacity: ready ? 1 : 0,
        transition:'opacity .3s',
        pointerEvents: ready ? 'auto' : 'none',
      }}
      // Clicking outside tooltip = next step
      onClick={goNext}
      />

      {/* Tooltip — above overlay */}
      {ready && (
        <div
          style={{
            ...tipPos(),
            zIndex: TOOLTIP_Z,
            background:'linear-gradient(145deg,#0d1520,#0b1018 60%,#0f1825)',
            border:'1px solid rgba(59,130,246,.45)',
            borderRadius:22,
            padding:'22px 22px 18px',
            boxShadow:'0 40px 100px rgba(0,0,0,.9), 0 0 0 1px rgba(59,130,246,.1), 0 0 50px rgba(59,130,246,.07)',
            animation:'tIn .32s cubic-bezier(.34,1.15,.64,1)',
          }}
          onClick={e => e.stopPropagation()} // prevent overlay click
        >
          {/* Progress */}
          <div style={{ height:2, background:'rgba(255,255,255,.06)', borderRadius:1, marginBottom:18, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#3b82f6,#06b6d4,#8b5cf6)', backgroundSize:'200%', borderRadius:1, transition:'width .5s', animation:'shimmer 3s linear infinite' }}/>
          </div>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
            <div style={{
              width:40, height:40, borderRadius:11, flexShrink:0,
              background: isLast ? 'linear-gradient(135deg,rgba(16,185,129,.18),rgba(6,182,212,.12))' : 'linear-gradient(135deg,rgba(59,130,246,.18),rgba(139,92,246,.12))',
              border:`1px solid ${isLast ? 'rgba(16,185,129,.3)' : 'rgba(59,130,246,.3)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: isLast ? '#34d399' : '#60a5fa',
            }}>{cur.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--serif)', fontSize:16, color:'#e8f0fe', lineHeight:1.25, marginBottom:3 }}>{cur.title}</div>
              <div style={{ fontSize:10.5, color:'#3d5270', fontFamily:'var(--mono)' }}>Passo {step+1} de {STEPS.length}</div>
            </div>
            <button onClick={handleClose}
              style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#4e6080', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(244,63,94,.15)';e.currentTarget.style.color='#f43f5e';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='#4e6080';}}>
              <X size={12}/>
            </button>
          </div>

          {/* Description */}
          <p style={{ fontSize:13, color:'#7a92b4', lineHeight:1.65, marginBottom:16, fontFamily:'var(--sans)' }}>{cur.description}</p>

          {/* Dots */}
          <div style={{ display:'flex', gap:4, marginBottom:14, justifyContent:'center' }}>
            {STEPS.map((_,i) => (
              <button key={i} onClick={()=>setStep(i)} style={{
                width:i===step?22:6, height:6, borderRadius:3, border:'none', padding:0, cursor:'pointer', transition:'all .25s',
                background: i===step ? 'linear-gradient(90deg,#3b82f6,#06b6d4)' : i<step ? 'rgba(59,130,246,.35)' : 'rgba(255,255,255,.08)',
              }}/>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display:'flex', gap:8 }}>
            {!isFirst && (
              <button onClick={()=>setStep(s=>s-1)} style={{ ...btnBase, padding:'0 16px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', color:'#7a92b4', flexShrink:0 }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.11)';e.currentTarget.style.color='#e8f0fe';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.06)';e.currentTarget.style.color='#7a92b4';}}>
                <ChevronLeft size={15}/> Anterior
              </button>
            )}
            <button onClick={goNext} style={{ ...btnBase, flex:1, background: isLast ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff', boxShadow: isLast ? '0 0 20px rgba(16,185,129,.4)' : '0 0 20px rgba(59,130,246,.4)' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 4px 28px ${isLast?'rgba(16,185,129,.6)':'rgba(59,130,246,.6)'}`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 20px ${isLast?'rgba(16,185,129,.4)':'rgba(59,130,246,.4)'}`;}}
            >
              {isLast ? <><CheckCircle size={14}/> Começar a usar!</> : <>Próximo <ChevronRight size={15}/></>}
            </button>
          </div>

          {!isLast && (
            <button onClick={handleClose} style={{ display:'block', width:'100%', marginTop:10, padding:'3px 0', background:'transparent', border:'none', color:'#3d5270', cursor:'pointer', fontSize:11.5, fontFamily:'var(--sans)', transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color='#7a92b4'}
              onMouseLeave={e=>e.currentTarget.style.color='#3d5270'}>
              Pular tour
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes tIn {
          from{opacity:0;transform:translateY(10px) scale(.96)}
          to  {opacity:1;transform:translateY(0) scale(1)}
        }
      `}</style>
    </>
  );

  function goNext() {
    if (isLast) handleClose();
    else setStep(s => s + 1);
  }
}

export function TourButton() {
  const [open, setOpen]     = useState(false);
  const [hinted, setHinted] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHinted(false), 7000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {hinted && !open && (
        <div style={{
          position:'fixed', bottom:82, right:24, zIndex:49996,
          background:'#0b1018', border:'1px solid rgba(59,130,246,.35)',
          borderRadius:10, padding:'8px 14px',
          fontSize:12.5, color:'#e8f0fe', whiteSpace:'nowrap',
          boxShadow:'0 4px 20px rgba(0,0,0,.6)',
          pointerEvents:'none', fontFamily:'var(--sans)',
          animation:'hintIn .4s ease',
        }}>
          ▶ Iniciar tour do sistema
          <div style={{ position:'absolute', bottom:-5, right:17, width:10, height:10, background:'#0b1018', border:'1px solid rgba(59,130,246,.35)', borderTop:'none', borderLeft:'none', transform:'rotate(45deg)' }}/>
        </div>
      )}

      <button
        onClick={()=>{ setOpen(true); setHinted(false); }}
        title="Iniciar tour do sistema"
        style={{
          position:'fixed', bottom:24, right:24, zIndex:49997,
          width:50, height:50, borderRadius:'50%',
          background:'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
          border:'2px solid rgba(255,255,255,.15)',
          cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff',
          boxShadow:'0 4px 24px rgba(59,130,246,.5), 0 0 0 5px rgba(59,130,246,.1)',
          transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
          animation: hinted ? 'tPulse 2.5s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='scale(1.12)'; e.currentTarget.style.boxShadow='0 6px 32px rgba(59,130,246,.7), 0 0 0 8px rgba(59,130,246,.15)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(59,130,246,.5), 0 0 0 5px rgba(59,130,246,.1)'; }}
      >
        <Play size={19} style={{ marginLeft:2 }}/>
      </button>

      <style>{`
        @keyframes tPulse {
          0%,100%{box-shadow:0 4px 24px rgba(59,130,246,.5),0 0 0 5px rgba(59,130,246,.1)}
          50%    {box-shadow:0 4px 24px rgba(59,130,246,.7),0 0 0 12px rgba(59,130,246,.06)}
        }
        @keyframes hintIn {
          from{opacity:0;transform:translateY(8px)}
          to  {opacity:1;transform:translateY(0)}
        }
      `}</style>

      {open && <Tour onClose={()=>setOpen(false)}/>}
    </>
  );
}
