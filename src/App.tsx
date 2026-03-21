import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Upload, Clock, Send, Settings, LogOut, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import DashboardPage from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import { signOut, updateProfile } from './lib/supabase';

function Sidebar() {
  const { user, profile } = useAuth();
  const loc = useLocation();
  const is  = (p: string) => loc.pathname.startsWith(p);
  const isAdmin = profile?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <div className="brand-gem">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,6 12,15 4,15 1,6" fill="#08080c"/>
              <polygon points="8,1 15,6 8,9" fill="rgba(0,0,0,0.3)"/>
            </svg>
          </div>
          <div className="brand-name">Betel Sport<em>Central de Resultados</em></div>
        </div>
      </div>
      <nav className="nav">
        <div className="nav-section">
          <div className="nav-section-label">Menu</div>
          <Link to="/import"   className={`nav-link ${is('/import')   ? 'active' : ''}`}><Upload   size={15}/> Importar dados</Link>
          <Link to="/history"  className={`nav-link ${is('/history')  ? 'active' : ''}`}><Clock    size={15}/> Histórico</Link>
          <Link to="/telegram" className={`nav-link ${is('/telegram') ? 'active' : ''}`}><Send     size={15}/> Telegram</Link>
        </div>
        {isAdmin && (
          <div className="nav-section">
            <div className="nav-section-label">Administração</div>
            <Link to="/admin"    className={`nav-link ${is('/admin')    ? 'active' : ''}`}><Shield   size={15}/> Usuários</Link>
            <Link to="/settings" className={`nav-link ${is('/settings') ? 'active' : ''}`}><Settings size={15}/> Configurações</Link>
          </div>
        )}
        {!isAdmin && (
          <div className="nav-section">
            <Link to="/settings" className={`nav-link ${is('/settings') ? 'active' : ''}`}><Settings size={15}/> Configurações</Link>
          </div>
        )}
      </nav>
      <div className="sidebar-foot">
        <div className="user-row">
          <div className="user-avatar">{(profile?.name || user?.email || 'U')[0].toUpperCase()}</div>
          <div>
            <div className="user-name">{profile?.name || user?.email?.split('@')[0]}</div>
            <div className="user-role">{profile?.role === 'admin' ? 'Administrador' : 'Betel Sport'}</div>
          </div>
          <button className="icon-btn" onClick={() => signOut()} title="Sair" style={{ marginLeft:'auto' }}><LogOut size={14}/></button>
        </div>
      </div>
    </aside>
  );
}

function PrivateLayout({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, loading, profile } = useAuth();
  if (loading)  return <div className="page-loading">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace/>;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/import" replace/>;
  return (
    <div className="app">
      <Sidebar/>
      <main className="main"><div className="content">{children}</div></main>
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
        <div className="field-group"><label>Token do Bot</label>
          <input type="password" value={token} onChange={e=>setToken(e.target.value)} className="field-input" placeholder="1234567890:AAF..."/>
          <span className="field-hint">Obtenha em @BotFather</span></div>
        <div className="field-group"><label>Chat ID</label>
          <input type="text" value={chatId} onChange={e=>setChatId(e.target.value)} className="field-input" placeholder="-1001234567890"/>
          <span className="field-hint">Use @userinfobot para descobrir</span></div>
        <button className="process-btn" onClick={handleSave}>{saved ? '✓ Salvo!' : 'Salvar configuração'}</button>
      </div>
    </div>
  );
}

// Auto-promote first user to admin on first login
function AutoPromote() {
  const { user, profile, refreshProfile } = useAuth();
  useEffect(() => {
    if (user && profile && profile.role !== 'admin') {
      // Check if this is the only user / owner account
      fetch('/api/admin/users').then(r => r.json()).then(async d => {
        const users = d.users || [];
        const isFirst = users.length === 1 && users[0].id === user.id;
        if (isFirst) {
          await fetch('/api/admin/promote-self', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
          await refreshProfile();
        }
      }).catch(() => {});
    }
  }, [user, profile]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<LoginPage/>}/>
          <Route path="/public/:token" element={<DashboardPage readOnly/>}/>
          <Route path="/import"        element={<PrivateLayout><AutoPromote/><ImportPage/></PrivateLayout>}/>
          <Route path="/history"       element={<PrivateLayout><HistoryPage/></PrivateLayout>}/>
          <Route path="/dashboard/:id" element={<PrivateLayout><DashboardPage/></PrivateLayout>}/>
          <Route path="/telegram"      element={<PrivateLayout><TelegramPage/></PrivateLayout>}/>
          <Route path="/admin"         element={<PrivateLayout adminOnly><AdminPage/></PrivateLayout>}/>
          <Route path="/settings" element={<PrivateLayout><SettingsPage/></PrivateLayout>}/>
          <Route path="/"              element={<Navigate to="/import" replace/>}/>
          <Route path="*"              element={<Navigate to="/import" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
