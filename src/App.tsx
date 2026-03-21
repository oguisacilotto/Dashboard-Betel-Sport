import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Upload, Clock, Send, Settings, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import DashboardPage from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { signOut, updateProfile } from './lib/supabase';

// ── Sidebar ─────────────────────────────────────────
function Sidebar() {
  const { user, profile } = useAuth();
  const loc = useLocation();
  const active = (path: string) => loc.pathname.startsWith(path);

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
          <div className="brand-name">
            Betel Sport
            <em>Central de Resultados</em>
          </div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-section">
          <div className="nav-section-label">Menu</div>
          <Link to="/import"   className={`nav-link ${active('/import')   ? 'active' : ''}`}><Upload   size={15}/> Importar dados</Link>
          <Link to="/history"  className={`nav-link ${active('/history')  ? 'active' : ''}`}><Clock    size={15}/> Histórico</Link>
          <Link to="/telegram" className={`nav-link ${active('/telegram') ? 'active' : ''}`}><Send     size={15}/> Telegram</Link>
          <Link to="/settings" className={`nav-link ${active('/settings') ? 'active' : ''}`}><Settings size={15}/> Configurações</Link>
        </div>
      </nav>

      <div className="sidebar-foot">
        <div className="user-row">
          <div className="user-avatar">{(profile?.name || user?.email || 'U')[0].toUpperCase()}</div>
          <div>
            <div className="user-name">{profile?.name || user?.email?.split('@')[0]}</div>
            <div className="user-role">Betel Sport</div>
          </div>
          <button className="icon-btn" onClick={() => signOut()} title="Sair" style={{ marginLeft: 'auto' }}>
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Auth Guard ────────────────────────────────────────
function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="page-loading">Carregando...</div>;
  if (!session)  return <Navigate to="/login" replace/>;
  return (
    <div className="app">
      <Sidebar/>
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

// ── Telegram Settings ─────────────────────────────────
function TelegramPage() {
  const { profile, refreshProfile, user } = useAuth();
  const [chatId, setChatId] = useState(profile?.telegram_chat_id || '');
  const [token,  setToken]  = useState('');
  const [saved,  setSaved]  = useState(false);

  const handleSave = async () => {
    if (!user) return;
    await updateProfile(user.id, {
      telegram_chat_id: chatId,
      ...(token ? { telegram_token: token } : {}),
    });
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <div className="page-head">
        <h1>Telegram</h1>
        <p>Configure seu bot para receber relatórios automáticos.</p>
      </div>
      <div className="settings-card">
        <div className="field-group">
          <label>Token do Bot</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            className="field-input" placeholder="1234567890:AAF..."/>
          <span className="field-hint">Obtenha em @BotFather no Telegram</span>
        </div>
        <div className="field-group">
          <label>Chat ID</label>
          <input type="text" value={chatId} onChange={e => setChatId(e.target.value)}
            className="field-input" placeholder="-1001234567890"/>
          <span className="field-hint">Use @userinfobot para descobrir seu chat ID</span>
        </div>
        <button className="process-btn" onClick={handleSave}>
          {saved ? '✓ Salvo!' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"          element={<LoginPage/>}/>
          <Route path="/public/:token"  element={<DashboardPage readOnly/>}/>
          <Route path="/import"         element={<PrivateLayout><ImportPage/></PrivateLayout>}/>
          <Route path="/history"        element={<PrivateLayout><HistoryPage/></PrivateLayout>}/>
          <Route path="/dashboard/:id"  element={<PrivateLayout><DashboardPage/></PrivateLayout>}/>
          <Route path="/telegram"       element={<PrivateLayout><TelegramPage/></PrivateLayout>}/>
          <Route path="/settings"       element={<PrivateLayout><div className="page-head"><h1>Configurações</h1></div></PrivateLayout>}/>
          <Route path="/"               element={<Navigate to="/import" replace/>}/>
          <Route path="*"               element={<Navigate to="/import" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
