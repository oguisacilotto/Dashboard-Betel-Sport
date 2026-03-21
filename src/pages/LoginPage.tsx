import { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
      } else {
        const { error: err } = await signUp(email, password, name);
        if (err) throw err;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Geist', system-ui, sans-serif",
      padding: '24px',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#0e0e14',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '40px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px',
            background: '#d4a853',
            borderRadius: '12px',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,6 12,15 4,15 1,6" fill="#08080c" stroke="#08080c" strokeWidth="0.5"/>
              <polygon points="8,1 15,6 8,9" fill="rgba(0,0,0,0.3)"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', color: '#f0ede8', marginBottom: '4px' }}>
            Betel Sport
          </div>
          <div style={{ fontSize: '11px', color: '#4e4d52', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Central de Resultados
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: '#141419',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '3px',
          marginBottom: '24px',
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: '8px',
              background: mode === m ? '#d4a853' : 'transparent',
              color: mode === m ? '#08080c' : '#8b8990',
              border: 'none', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: mode === m ? 600 : 400,
              transition: 'all .15s',
              fontFamily: "'Geist', system-ui, sans-serif",
            }}>
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4e4d52', display: 'block', marginBottom: '6px' }}>
                Nome
              </label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Seu nome completo"
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4e4d52', display: 'block', marginBottom: '6px' }}>
              E-mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu@email.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4e4d52', display: 'block', marginBottom: '6px' }}>
              Senha
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(226,75,74,.08)', border: '1px solid rgba(226,75,74,.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#f09595' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: '4px',
            width: '100%', padding: '12px',
            background: loading ? '#8a6e30' : '#d4a853',
            color: '#08080c', fontWeight: 700,
            border: 'none', borderRadius: '10px',
            fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background .15s',
            fontFamily: "'Geist', system-ui, sans-serif",
          }}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>

      {/* Signature */}
      <div style={{
        marginTop: '28px',
        fontSize: '11px',
        color: '#3a3940',
        letterSpacing: '0.04em',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span>by</span>
        <span style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: '12px',
          color: '#6b6340',
          fontStyle: 'italic',
        }}>
          Guilherme Sacilotto
        </span>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1b1b22',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#f0ede8',
  fontSize: '13px',
  outline: 'none',
  fontFamily: "'Geist', system-ui, sans-serif",
  boxSizing: 'border-box',
};
