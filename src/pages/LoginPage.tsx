import { useState } from 'react';
import { signIn } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'pending';

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        const msg = err.message || '';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
          setError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
        else if (msg.includes('Email not confirmed'))
          setError('Sua conta ainda não foi aprovada pelo administrador. Aguarde a liberação.');
        else if (msg.includes('too many requests') || msg.includes('rate limit'))
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        else
          setError(err.message || 'Erro ao entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.message?.includes('already')) setError('Este e-mail já possui uma solicitação ou conta cadastrada.');
        else setError(json.message || 'Erro ao enviar solicitação.');
      } else {
        setMode('pending');
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', background: '#1b1b22',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px', padding: '10px 12px',
    color: '#f0ede8', fontSize: '13px', outline: 'none',
    fontFamily: "'Geist', system-ui, sans-serif", boxSizing: 'border-box',
    transition: 'border-color .15s',
  };

  // ── Pending approval screen ───────────────────────────
  if (mode === 'pending') {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '20px', color: '#f0ede8', marginBottom: '8px' }}>
              Solicitação enviada!
            </div>
            <div style={{ fontSize: '12.5px', color: '#8b8990', lineHeight: '1.6', marginBottom: '24px' }}>
              Sua solicitação foi enviada ao administrador.<br/>
              Você receberá um e-mail assim que sua conta for aprovada.
            </div>
            <button onClick={() => { setMode('login'); setEmail(''); setPassword(''); setName(''); }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8b8990', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px', fontFamily: "'Geist', system-ui, sans-serif" }}>
              Voltar ao login
            </button>
          </div>
        </div>
        <Signature />
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: '#d4a853', borderRadius: '12px', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,6 12,15 4,15 1,6" fill="#08080c"/>
              <polygon points="8,1 15,6 8,9" fill="rgba(0,0,0,0.3)"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', color: '#f0ede8', marginBottom: '3px' }}>Betel Sport</div>
          <div style={{ fontSize: '10.5px', color: '#4e4d52', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Central de Resultados</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#141419', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '3px', marginBottom: '24px' }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '8px', borderRadius: '8px',
              background: mode === m ? '#d4a853' : 'transparent',
              color: mode === m ? '#08080c' : '#8b8990',
              border: 'none', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: mode === m ? 700 : 400,
              transition: 'all .15s', fontFamily: "'Geist', system-ui, sans-serif",
            }}>
              {m === 'login' ? 'Entrar' : 'Solicitar acesso'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'signup' && (
            <div>
              <label style={labelStyle}>Nome completo</label>
              <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome" required autoComplete="name"/>
            </div>
          )}
          <div>
            <label style={labelStyle}>E-mail</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required autoComplete="email"/>
          </div>
          <div>
            <label style={labelStyle}>Senha</label>
            <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
            {mode === 'signup' && (
              <div style={{ fontSize: '11px', color: '#4e4d52', marginTop: '4px' }}>Mínimo 6 caracteres</div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(242,107,107,0.08)', border: '1px solid rgba(242,107,107,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', color: '#f09595', lineHeight: '1.4' }}>
              {error}
            </div>
          )}

          {/* Info for signup */}
          {mode === 'signup' && !error && (
            <div style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.18)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#b8943a', lineHeight: '1.4' }}>
              Sua solicitação será analisada pelo administrador. Você será notificado por e-mail após a aprovação.
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: '4px', width: '100%', padding: '12px',
            background: loading ? '#8a6e30' : '#d4a853',
            color: '#08080c', fontWeight: 700, border: 'none',
            borderRadius: '10px', fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
            fontFamily: "'Geist', system-ui, sans-serif",
          }}>
            {loading
              ? 'Aguarde...'
              : mode === 'login' ? 'Entrar' : 'Enviar solicitação'}
          </button>
        </form>
      </div>
      <Signature />
    </div>
  );
}

function Signature() {
  return (
    <div style={{ marginTop: '28px', fontSize: '11px', color: '#3a3940', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span>by</span>
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '12px', color: '#6b6340', fontStyle: 'italic' }}>
        Guilherme Sacilotto
      </span>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: '100vh', background: '#08080c',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Geist', system-ui, sans-serif", padding: '24px',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: '400px',
  background: '#0e0e14',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '20px', padding: '40px',
};
const labelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#4e4d52', display: 'block', marginBottom: '6px',
};
