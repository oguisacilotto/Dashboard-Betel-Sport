import { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';

export default function LoginPage() {
  const [mode, setMode]       = useState<'login' | 'signup'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
      } else {
        const { error: err, data } = await signUp(email, password, name);
        if (err) throw err;
        // Supabase can require email confirmation
        if (data?.user && !data.session) {
          setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
          setLoading(false);
          return;
        }
        setSuccess('Conta criada com sucesso! Entrando...');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao autenticar';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Email already registered') || msg.includes('already registered')) setError('Este e-mail já está cadastrado. Tente fazer login.');
      else if (msg.includes('Password should be')) setError('A senha deve ter no mínimo 6 caracteres.');
      else setError(msg);
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
  };

  return (
    <div style={{ minHeight:'100vh', background:'#08080c', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Geist', system-ui, sans-serif", padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'400px', background:'#0e0e14', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'40px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'48px', height:'48px', background:'#d4a853', borderRadius:'12px', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <polygon points="8,1 15,6 12,15 4,15 1,6" fill="#08080c"/>
              <polygon points="8,1 15,6 8,9" fill="rgba(0,0,0,0.3)"/>
            </svg>
          </div>
          <div style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'22px', color:'#f0ede8', marginBottom:'4px' }}>Betel Sport</div>
          <div style={{ fontSize:'11px', color:'#4e4d52', letterSpacing:'0.1em', textTransform:'uppercase' }}>Central de Resultados</div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'#141419', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'3px', marginBottom:'24px' }}>
          {(['login','signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{
              flex:1, padding:'8px', borderRadius:'8px',
              background: mode===m ? '#d4a853' : 'transparent',
              color: mode===m ? '#08080c' : '#8b8990',
              border:'none', cursor:'pointer',
              fontSize:'12.5px', fontWeight: mode===m ? 700 : 400,
              transition:'all .15s', fontFamily:"'Geist', system-ui, sans-serif",
            }}>
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize:'10px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#4e4d52', display:'block', marginBottom:'6px' }}>Nome completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome completo" style={inp}/>
            </div>
          )}
          <div>
            <label style={{ fontSize:'10px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#4e4d52', display:'block', marginBottom:'6px' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize:'10px', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#4e4d52', display:'block', marginBottom:'6px' }}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inp}/>
            {mode === 'signup' && <div style={{ fontSize:'10.5px', color:'#4e4d52', marginTop:'4px' }}>Mínimo 6 caracteres</div>}
          </div>

          {error && (
            <div style={{ background:'rgba(242,107,107,.08)', border:'1px solid rgba(242,107,107,.2)', borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:'#f09595' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background:'rgba(62,207,142,.08)', border:'1px solid rgba(62,207,142,.2)', borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:'#3ecf8e' }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop:'4px', width:'100%', padding:'12px',
            background: loading ? '#8a6e30' : '#d4a853',
            color:'#08080c', fontWeight:700, border:'none', borderRadius:'10px',
            fontSize:'13px', cursor: loading ? 'not-allowed' : 'pointer',
            transition:'background .15s', fontFamily:"'Geist', system-ui, sans-serif",
          }}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>

      {/* Signature */}
      <div style={{ marginTop:'28px', fontSize:'11px', color:'#3a3940', letterSpacing:'0.04em', display:'flex', alignItems:'center', gap:'6px' }}>
        <span>by</span>
        <span style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'12px', color:'#6b6340', fontStyle:'italic' }}>
          Guilherme Sacilotto
        </span>
      </div>
    </div>
  );
}
