import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { Upload, Clock, Send, Settings, LogOut, Shield, GitCompare, BarChart2, CalendarClock, Menu, X as XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import ComparePage from './pages/ComparePage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import { signOut, updateProfile } from './lib/supabase';
import { TourButton } from './components/Tour';

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const loc     = useLocation();
  const is      = (p: string) => loc.pathname.startsWith(p);
  const isAdmin = profile?.role === 'admin';

  // Close sidebar on route change (mobile)
  useEffect(() => { onClose(); }, [loc.pathname]);

  // Close on Esc
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const NavLink = ({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) => {
    const active = exact ? loc.pathname === to : is(to);
    return (
      <Link to={to} className={`nav-link ${active ? 'active' : ''}`}>
        {icon} {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay — tap to close */}
      {open && (
        <div
          onClick={onClose}
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(4,6,8,.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 199,
          }}
          className="sidebar-overlay"
        />
      )}

      <aside
        className="sidebar"
        style={{
          transform: open ? 'translateX(0)' : undefined,
        }}
      >
        <div className="brand">
          <div className="brand-mark">
            <div className="brand-gem">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="8,1 15,6 12,15 4,15 1,6" fill="#040608"/>
                <polygon points="8,1 15,6 8,9" fill="rgba(0,0,0,0.3)"/>
              </svg>
            </div>
            <div className="brand-name">Betel Sport<em>Central de Resultados</em></div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="Fechar menu"
          >
            <XIcon size={16}/>
          </button>
        </div>

        <nav className="nav">
          <div className="nav-section">
            <div className="nav-section-label">Análises</div>
            <NavLink to="/import"   icon={<Upload size={15}/>}        label="Importar dados"/>
            <NavLink to="/history"  icon={<Clock size={15}/>}         label="Histórico"/>
            <NavLink to="/compare"  icon={<GitCompare size={15}/>}    label="Comparar"/>
            <NavLink to="/schedule" icon={<CalendarClock size={15}/>} label="Agendamentos"/>
          </div>
          <div className="nav-section">
            <div className="nav-section-label">Integrações</div>
            <NavLink to="/telegram" icon={<Send size={15}/>} label="Telegram"/>
          </div>
          {isAdmin && (
            <div className="nav-section">
              <div className="nav-section-label">Administração</div>
              <Link to="/admin"           className={`nav-link ${is('/admin') && !is('/admin/analytics') ? 'active' : ''}`}><Shield size={15}/> Usuários</Link>
              <Link to="/admin/analytics" className={`nav-link ${is('/admin/analytics') ? 'active' : ''}`}><BarChart2 size={15}/> Métricas</Link>
            </div>
          )}
          <div className="nav-section">
            <NavLink to="/settings" icon={<Settings size={15}/>} label="Configurações"/>
          </div>
        </nav>

        <div className="sidebar-foot">
          <div className="user-row">
            <div className="user-avatar">{(profile?.name || user?.email || 'U')[0].toUpperCase()}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {profile?.name || user?.email?.split('@')[0]}
              </div>
              <div className="user-role">{profile?.role === 'admin' ? '⚡ Administrador' : 'Betel Sport'}</div>
            </div>
            <button className="icon-btn" onClick={() => signOut()} title="Sair" style={{ marginLeft:'auto', flexShrink:0 }}>
              <LogOut size={14}/>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function PrivateLayout({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, loading, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading)  return <div className="page-loading">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace/>;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/import" replace/>;

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Abrir menu"
          >
            <Menu size={20}/>
          </button>
          <div style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--t1)' }}>Betel Sport</div>
          <div style={{ width:36 }}/>
        </div>
        <div className="content">{children}</div>
      </main>
      <TourButton/>
    </div>
  );
}

function TelegramPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [chatId, setChatId] = useState(profile?.telegram_chat_id || '');
  const [token,  setToken]  = useState('');
  const [saved,  setSaved]  = useState(false);
  const handleSave = async () => {
    if (!user) return;
    const up: Record<string,string> = { telegram_chat_id: chatId };
    if (token) up.telegram_token = token;
    await updateProfile(user.id, up as any);
    await refreshProfile();
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="settings-page">
      <div className="page-head"><h1>Telegram</h1><p>Configure seu bot para relatórios automáticos.</p></div>
      <div className="settings-card">
        <div className="field-group">
          <label>Token do Bot</label>
          <input type="password" value={token} onChange={e=>setToken(e.target.value)} className="field-input" placeholder="1234567890:AAF..."/>
          <span className="field-hint">Obtenha em @BotFather no Telegram</span>
        </div>
        <div className="field-group">
          <label>Chat ID</label>
          <input type="text" value={chatId} onChange={e=>setChatId(e.target.value)} className="field-input" placeholder="-1001234567890"/>
          <span className="field-hint">Use @userinfobot para descobrir</span>
        </div>
        <button className="process-btn" onClick={handleSave}>{saved ? '✓ Salvo!' : 'Salvar configuração'}</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"              element={<LoginPage/>}/>
          <Route path="/public/:token"      element={<DashboardPage readOnly/>}/>
          <Route path="/import"             element={<PrivateLayout><ImportPage/></PrivateLayout>}/>
          <Route path="/history"            element={<PrivateLayout><HistoryPage/></PrivateLayout>}/>
          <Route path="/compare"            element={<PrivateLayout><ComparePage/></PrivateLayout>}/>
          <Route path="/schedule"           element={<PrivateLayout><SchedulePage/></PrivateLayout>}/>
          <Route path="/dashboard/:id"      element={<PrivateLayout><DashboardPage/></PrivateLayout>}/>
          <Route path="/telegram"           element={<PrivateLayout><TelegramPage/></PrivateLayout>}/>
          <Route path="/admin"              element={<PrivateLayout adminOnly><AdminPage/></PrivateLayout>}/>
          <Route path="/admin/analytics"    element={<PrivateLayout adminOnly><AdminAnalyticsPage/></PrivateLayout>}/>
          <Route path="/settings"           element={<PrivateLayout><SettingsPage/></PrivateLayout>}/>
          <Route path="/"                   element={<Navigate to="/import" replace/>}/>
          <Route path="*"                   element={<Navigate to="/import" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
