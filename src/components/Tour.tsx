import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, X, Upload, Clock, GitCompare,
  CalendarClock, Send, Shield, BarChart2, Settings,
  Sparkles, RefreshCw, MessageCircle, Share2, Download,
  Play, CheckCircle
} from 'lucide-react';

export interface TourStep {
  id: string;
  route: string;
  selector?: string;       // CSS selector to highlight
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'top'|'bottom'|'left'|'right'|'center';
  action?: string;         // CTA text
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/import',
    title: 'Bem-vindo à Central de Resultados',
    description: 'Este tour vai te guiar por todas as funcionalidades da plataforma. Você vai ver como importar dados, gerar análises com IA, comparar relatórios e muito mais. Leva menos de 3 minutos!',
    icon: <Sparkles size={22}/>,
    position: 'center',
    action: 'Começar tour',
  },
  {
    id: 'import',
    route: '/import',
    selector: '.source-grid',
    title: 'Importar dados',
    description: 'Aqui você escolhe de onde vêm seus dados. São 9 fontes disponíveis: PDF, Excel, CSV, XML, URL, banco de dados, imagens, áudio e Nextcloud. Basta clicar na fonte desejada.',
    icon: <Upload size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'template',
    route: '/import',
    selector: '.source-grid',
    title: 'Templates de análise',
    description: 'Antes de analisar, escolha um template: Geral, Financeiro, Vendas, Equipe, Operacional ou Executivo. O Gemini adapta o prompt para gerar insights muito mais precisos para o seu contexto.',
    icon: <Sparkles size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'telegram-toggle',
    route: '/import',
    selector: '.telegram-toggle',
    title: 'Envio automático ao Telegram',
    description: 'Este toggle controla se os resultados serão enviados automaticamente ao seu Telegram após a análise. Útil para desativar em documentos confidenciais.',
    icon: <Send size={22}/>,
    position: 'top',
    action: 'Próximo',
  },
  {
    id: 'history',
    route: '/history',
    selector: '.page-head',
    title: 'Histórico de análises',
    description: 'As 2 análises mais recentes ficam sempre visíveis em destaque. Clique em "Ver mais" para expandir e ver as últimas 20 análises. Cada análise mostra fonte, data e badges de Telegram e link público.',
    icon: <Clock size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'dashboard',
    route: '/history',
    selector: '.page-head',
    title: 'Dashboard com IA',
    description: 'Ao clicar em qualquer análise, você abre o dashboard completo: 6 KPIs, 4 gráficos visíveis + 6 expansíveis, e os 10 principais insights gerados automaticamente pelo Gemini.',
    icon: <BarChart2 size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'regenerate',
    route: '/history',
    selector: '.page-head',
    title: 'Regenerar e focar insights',
    description: 'No dashboard, o botão "Gerar novamente" pede ao Gemini uma nova análise do mesmo documento. E o ícone ✨ em cada insight gera um dashboard focado exclusivamente naquele tópico — abre em nova aba!',
    icon: <RefreshCw size={22}/>,
    position: 'center',
    action: 'Próximo',
  },
  {
    id: 'comments',
    route: '/history',
    selector: '.page-head',
    title: 'Comentários nos insights',
    description: 'Cada insight tem um botão "Comentar". Adicione observações, planos de ação ou contexto. Os comentários ficam salvos por análise e visíveis para toda a equipe que tiver acesso.',
    icon: <MessageCircle size={22}/>,
    position: 'center',
    action: 'Próximo',
  },
  {
    id: 'compare',
    route: '/compare',
    selector: '.page-head',
    title: 'Comparador de análises',
    description: 'Selecione duas análises e veja os KPIs lado a lado com percentual de diferença. Setas verde/vermelho indicam qual análise está melhor em cada métrica. Ótimo para comparar meses ou filiais.',
    icon: <GitCompare size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'schedule',
    route: '/schedule',
    selector: '.page-head',
    title: 'Agendamentos automáticos',
    description: 'Configure relatórios que rodam sozinhos: escolha um arquivo no Nextcloud, a frequência (diário, semanal, quinzenal) e o template. O sistema analisa automaticamente e envia o resumo no Telegram.',
    icon: <CalendarClock size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'telegram',
    route: '/telegram',
    selector: '.settings-card',
    title: 'Integração Telegram',
    description: 'Configure o token do seu bot e o Chat ID aqui. Depois de salvo, todos os relatórios gerados (manual ou automático) são enviados diretamente para você no Telegram com insights e KPIs formatados.',
    icon: <Send size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'settings',
    route: '/settings',
    selector: '.page-head',
    title: 'Configurações',
    description: 'Aqui você edita seu perfil, altera a senha, configura o Telegram com botão de teste, e na aba "Conta" vê todas as informações da sua sessão incluindo opção de sair de todos os dispositivos.',
    icon: <Settings size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'admin',
    route: '/admin',
    selector: '.page-head',
    title: 'Painel do administrador',
    description: 'Como administrador, você gerencia todos os usuários: aprova solicitações de acesso, cria contas diretamente, redefine senhas, edita perfis e envia e-mails. O Telegram te notifica cada nova solicitação.',
    icon: <Shield size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'analytics',
    route: '/admin/analytics',
    selector: '.page-head',
    title: 'Métricas de uso',
    description: 'Veja o total de análises, usuários ativos, envios Telegram e dashboards públicos. Um gráfico mostra quais fontes são mais usadas e o ranking de usuários por volume de análises geradas.',
    icon: <BarChart2 size={22}/>,
    position: 'bottom',
    action: 'Próximo',
  },
  {
    id: 'finish',
    route: '/import',
    title: 'Tour concluído! 🎉',
    description: 'Agora você conhece todo o sistema. Comece importando um documento real da Betel Sport e veja a IA gerar insights executivos em segundos. Qualquer dúvida, o botão "Tour" está sempre disponível.',
    icon: <CheckCircle size={22}/>,
    position: 'center',
    action: 'Começar a usar!',
  },
];

interface TourProps {
  onClose: () => void;
}

export function Tour({ onClose }: TourProps) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [step, setStep]   = useState(0);
  const [rect, setRect]   = useState<DOMRect|null>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<any>(null);

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === TOUR_STEPS.length - 1;

  // Navigate to route and find element
  const activate = useCallback((s: TourStep) => {
    if (location.pathname !== s.route) {
      navigate(s.route);
    }
    timeoutRef.current = setTimeout(() => {
      if (s.selector) {
        const el = document.querySelector(s.selector);
        if (el) setRect(el.getBoundingClientRect());
        else setRect(null);
      } else {
        setRect(null);
      }
      setVisible(true);
    }, 350);
  }, [location.pathname, navigate]);

  useEffect(() => {
    setVisible(false);
    activate(current);
    return () => clearTimeout(timeoutRef.current);
  }, [step]);

  // Recalc on resize
  useEffect(() => {
    const handler = () => {
      if (current.selector) {
        const el = document.querySelector(current.selector);
        if (el) setRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [current]);

  const goNext = () => {
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  };
  const goPrev = () => { if (!isFirst) setStep(s => s - 1); };

  const progress = ((step) / (TOUR_STEPS.length - 1)) * 100;

  // Spotlight dimensions
  const PADDING = 12;
  const spotlight = rect ? {
    top:    rect.top    - PADDING,
    left:   rect.left   - PADDING,
    width:  rect.width  + PADDING * 2,
    height: rect.height + PADDING * 2,
  } : null;

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const W = 380;
    if (!rect || current.position === 'center') {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: W,
        zIndex: 10001,
      };
    }
    const pos = current.position || 'bottom';
    const base: React.CSSProperties = { position: 'fixed', width: W, zIndex: 10001 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (pos === 'bottom') {
      return { ...base, top: rect.bottom + PADDING + 10, left: Math.min(Math.max(cx - W/2, 12), window.innerWidth - W - 12) };
    }
    if (pos === 'top') {
      return { ...base, bottom: window.innerHeight - rect.top + PADDING + 10, left: Math.min(Math.max(cx - W/2, 12), window.innerWidth - W - 12) };
    }
    if (pos === 'right') {
      return { ...base, top: Math.min(Math.max(cy - 100, 12), window.innerHeight - 220), left: rect.right + PADDING + 10 };
    }
    if (pos === 'left') {
      return { ...base, top: Math.min(Math.max(cy - 100, 12), window.innerHeight - 220), right: window.innerWidth - rect.left + PADDING + 10 };
    }
    return base;
  };

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(4,6,8,0.82)',
        backdropFilter: 'blur(2px)',
        transition: 'opacity .3s',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}/>

      {/* Spotlight highlight */}
      {spotlight && visible && (
        <div style={{
          position: 'fixed', zIndex: 9999, pointerEvents: 'none',
          top:    spotlight.top,
          left:   spotlight.left,
          width:  spotlight.width,
          height: spotlight.height,
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(4,6,8,0.82)',
          border: '2px solid rgba(59,130,246,0.6)',
          animation: 'tourPulse 2s ease-in-out infinite',
          transition: 'all .35s cubic-bezier(.4,0,.2,1)',
        }}/>
      )}

      {/* Tooltip card */}
      {visible && (
        <div style={{
          ...getTooltipStyle(),
          background: 'linear-gradient(135deg, #0b1018 0%, #101620 100%)',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,.8), 0 0 0 1px rgba(59,130,246,0.1), 0 0 40px rgba(59,130,246,0.08)',
          animation: 'tourFadeIn .3s ease',
        }}>
          {/* Progress bar */}
          <div style={{ height: 2, background: 'rgba(59,130,246,.15)', borderRadius: 1, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)',
              borderRadius: 1,
              transition: 'width .4s ease',
              backgroundSize: '200%',
              animation: 'shimmer 3s linear infinite',
            }}/>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(59,130,246,.2), rgba(6,182,212,.15))',
              border: '1px solid rgba(59,130,246,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#60a5fa',
            }}>
              {current.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--t1)', lineHeight: 1.2 }}>
                {current.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                {step + 1} / {TOUR_STEPS.length}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--line-2)',
              color: 'var(--t3)', borderRadius: 8, padding: 5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
              transition: 'all .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--t1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}>
              <X size={13}/>
            </button>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13, color: 'var(--t2)', lineHeight: 1.65,
            marginBottom: 20, fontFamily: 'var(--sans)',
          }}>
            {current.description}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 18, justifyContent: 'center' }}>
            {TOUR_STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step
                  ? 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                  : i < step ? 'rgba(59,130,246,.4)' : 'var(--line-2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all .25s ease',
                padding: 0,
              }}/>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isFirst && (
              <button onClick={goPrev} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--t2)', borderRadius: 10, padding: '9px 14px',
                cursor: 'pointer', fontSize: 12.5, fontFamily: 'var(--sans)',
                transition: 'all .14s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--t1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}>
                <ChevronLeft size={13}/> Anterior
              </button>
            )}
            <button onClick={goNext} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: isLast
                ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff', fontWeight: 700, border: 'none',
              borderRadius: 10, padding: '10px 16px',
              cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)',
              boxShadow: isLast
                ? '0 0 16px rgba(16,185,129,0.3)'
                : '0 0 16px rgba(59,130,246,0.3)',
              transition: 'all .14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(59,130,246,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(59,130,246,0.3)'; }}>
              {isLast ? <><CheckCircle size={14}/> {current.action}</> : <>{current.action} <ChevronRight size={13}/></>}
            </button>
          </div>

          {/* Skip all */}
          {!isLast && (
            <button onClick={onClose} style={{
              display: 'block', width: '100%', marginTop: 10,
              background: 'transparent', border: 'none',
              color: 'var(--t3)', cursor: 'pointer', fontSize: 11.5,
              fontFamily: 'var(--sans)', padding: '4px 0',
              transition: 'color .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}>
              Pular tour
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(4,6,8,0.82), 0 0 20px rgba(59,130,246,0.3); }
          50%       { box-shadow: 0 0 0 9999px rgba(4,6,8,0.82), 0 0 40px rgba(59,130,246,0.6); }
        }
        @keyframes tourFadeIn {
          from { opacity:0; transform: translateY(8px) scale(.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

// ── Tour button — floating ────────────────────────
export function TourButton() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Stop pulsing after first interaction
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setPulse(false); }}
        title="Iniciar tour do sistema"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
          width: 46, height: 46, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(59,130,246,0.45), 0 0 0 4px rgba(59,130,246,0.12)',
          transition: 'all .2s',
          animation: pulse ? 'tourBtnPulse 2s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.6), 0 0 0 6px rgba(59,130,246,0.18)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.45), 0 0 0 4px rgba(59,130,246,0.12)';
        }}
      >
        <Play size={18} style={{ marginLeft: 2 }}/>
      </button>

      {/* Tooltip on first load */}
      {pulse && (
        <div style={{
          position: 'fixed', bottom: 78, right: 24, zIndex: 9997,
          background: 'var(--surface-3)', border: '1px solid var(--line-2)',
          borderRadius: 10, padding: '8px 12px',
          fontSize: 12, color: 'var(--t1)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,.4)',
          animation: 'tourFadeIn .4s ease',
          pointerEvents: 'none',
        }}>
          ▶ Tour do sistema
          <div style={{ position: 'absolute', bottom: -5, right: 20, width: 10, height: 10, background: 'var(--surface-3)', border: '1px solid var(--line-2)', transform: 'rotate(45deg)', borderTop: 'none', borderLeft: 'none' }}/>
        </div>
      )}

      <style>{`
        @keyframes tourBtnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(59,130,246,0.45), 0 0 0 4px rgba(59,130,246,0.12); }
          50%       { box-shadow: 0 4px 20px rgba(59,130,246,0.7), 0 0 0 10px rgba(59,130,246,0.08); }
        }
      `}</style>

      {open && <Tour onClose={() => setOpen(false)}/>}
    </>
  );
}
