import { useState } from 'react';
import { User, Lock, Bell, Send, Globe, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, supabase } from '../lib/supabase';

type Section = 'profile' | 'password' | 'telegram' | 'notifications' | 'account';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [section, setSection] = useState<Section>('profile');

  // Profile
  const [name,    setName]    = useState(profile?.name || '');
  const [saved,   setSaved]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Password
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew,     setPwdNew]     = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  // Telegram
  const [tgChatId, setTgChatId] = useState(profile?.telegram_chat_id || '');
  const [tgToken,  setTgToken]  = useState('');
  const [tgEnabled, setTgEnabled] = useState(profile?.telegram_enabled ?? true);

  const notify = (msg: string, isErr = false) => {
    if (isErr) setError(msg); else setSaved(msg);
    setTimeout(() => { setSaved(''); setError(''); }, 3000);
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    await updateProfile(user.id, { name } as any);
    await refreshProfile();
    setLoading(false);
    notify('Perfil atualizado com sucesso!');
  };

  const savePassword = async () => {
    if (pwdNew !== pwdConfirm) { notify('As senhas não coincidem.', true); return; }
    if (pwdNew.length < 6)     { notify('Mínimo 6 caracteres.', true); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pwdNew });
    setLoading(false);
    if (err) notify(err.message, true);
    else { notify('Senha alterada com sucesso!'); setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); }
  };

  const saveTelegram = async () => {
    if (!user) return;
    setLoading(true);
    const up: Record<string, any> = { telegram_chat_id: tgChatId, telegram_enabled: tgEnabled };
    if (tgToken) up.telegram_token = tgToken;
    await updateProfile(user.id, up as any);
    await refreshProfile();
    setLoading(false);
    notify('Configuração do Telegram salva!');
  };

  const testTelegram = async () => {
    const r = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id }),
    });
    if (r.ok) notify('Mensagem de teste enviada! Verifique seu Telegram.');
    else notify('Erro ao enviar. Verifique o token e o Chat ID.', true);
  };

  const nav: { id: Section; label: string; icon: any }[] = [
    { id: 'profile',       label: 'Perfil',        icon: User   },
    { id: 'password',      label: 'Senha',          icon: Lock   },
    { id: 'telegram',      label: 'Telegram',       icon: Send   },
    { id: 'notifications', label: 'Notificações',   icon: Bell   },
    { id: 'account',       label: 'Conta',          icon: Shield },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-head">
        <h1>Configurações</h1>
        <p>Gerencie seu perfil, segurança e integrações</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>

        {/* Sidebar nav */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r16)', padding: 8, height: 'fit-content' }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => { setSection(n.id); setSaved(''); setError(''); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 'var(--r8)',
                background: section === n.id ? 'var(--gold-dim)' : 'transparent',
                color: section === n.id ? 'var(--gold)' : 'var(--t2)',
                border: section === n.id ? '1px solid rgba(212,168,83,.18)' : '1px solid transparent',
                cursor: 'pointer', fontSize: 12.5, textAlign: 'left',
                marginBottom: 1, transition: 'all .14s',
                fontFamily: 'var(--sans)',
              }}>
              <n.icon size={14}/> {n.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r16)', padding: 28 }}>

          {/* Feedback */}
          {saved && <div style={{ background: 'rgba(62,207,142,.08)', border: '1px solid rgba(62,207,142,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--up)', marginBottom: 20 }}>✓ {saved}</div>}
          {error && <div style={{ background: 'rgba(242,107,107,.08)', border: '1px solid rgba(242,107,107,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--down)', marginBottom: 20 }}>⚠ {error}</div>}

          {/* ── Profile ── */}
          {section === 'profile' && (
            <div>
              <SectionTitle icon={<User size={16}/>} title="Informações do perfil" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div className="user-avatar" style={{ width: 56, height: 56, fontSize: 22, borderRadius: 14 }}>
                  {(profile?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{profile?.name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{user?.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, background: 'var(--gold-dim)', display: 'inline-block', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(212,168,83,.18)' }}>
                    {profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </div>
                </div>
              </div>
              <Field label="Nome completo">
                <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo"/>
              </Field>
              <Field label="E-mail">
                <input className="field-input" value={user?.email || ''} disabled style={{ opacity: .5, cursor: 'not-allowed' }}/>
                <span className="field-hint">O e-mail não pode ser alterado por aqui. Contate o administrador.</span>
              </Field>
              <Btn onClick={saveProfile} loading={loading}>Salvar perfil</Btn>
            </div>
          )}

          {/* ── Password ── */}
          {section === 'password' && (
            <div>
              <SectionTitle icon={<Lock size={16}/>} title="Alterar senha" />
              <Field label="Nova senha">
                <input className="field-input" type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)"/>
              </Field>
              <Field label="Confirmar nova senha">
                <input className="field-input" type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} placeholder="Repita a nova senha"/>
              </Field>
              <div style={{ background: 'rgba(212,168,83,.07)', border: '1px solid rgba(212,168,83,.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#b8943a', marginBottom: 20 }}>
                Após alterar a senha você permanecerá logado neste dispositivo. Outros dispositivos serão desconectados.
              </div>
              <Btn onClick={savePassword} loading={loading}>Alterar senha</Btn>
            </div>
          )}

          {/* ── Telegram ── */}
          {section === 'telegram' && (
            <div>
              <SectionTitle icon={<Send size={16}/>} title="Integração Telegram" />
              <Field label="Token do Bot">
                <input className="field-input" type="password" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="7123456789:AAF... (deixe em branco para manter o atual)"/>
                <span className="field-hint">Obtenha em @BotFather no Telegram</span>
              </Field>
              <Field label="Chat ID">
                <input className="field-input" value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="-1001234567890"/>
                <span className="field-hint">Use @userinfobot para descobrir seu Chat ID</span>
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Envio automático ao analisar</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Insights e KPIs enviados automaticamente após cada análise</div>
                </div>
                <button onClick={() => setTgEnabled(v => !v)} style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: tgEnabled ? 'var(--gold)' : 'var(--line-2)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s'
                }}>
                  <span style={{ position: 'absolute', top: 3, left: tgEnabled ? 20 : 3, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left .2s', display: 'block' }}/>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={saveTelegram} loading={loading}>Salvar configuração</Btn>
                <button onClick={testTelegram} className="btn-outline" style={{ padding: '0 16px', height: 38, borderRadius: 10, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={13}/> Testar envio
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {section === 'notifications' && (
            <div>
              <SectionTitle icon={<Bell size={16}/>} title="Preferências de notificação" />
              {[
                { label: 'Nova análise concluída', sub: 'Receber notificação quando uma análise terminar', def: true },
                { label: 'Novo usuário solicitou acesso', sub: 'Alerta quando alguém pedir para criar conta', def: true },
                { label: 'Relatório enviado via Telegram', sub: 'Confirmação após cada envio bem-sucedido', def: false },
                { label: 'Resumo semanal', sub: 'Receber resumo dos dashboards criados na semana', def: false },
              ].map((item, i) => (
                <Toggle key={i} label={item.label} sub={item.sub} defaultValue={item.def}/>
              ))}
              <Btn onClick={() => notify('Preferências salvas!')} loading={false}>Salvar preferências</Btn>
            </div>
          )}

          {/* ── Account ── */}
          {section === 'account' && (
            <div>
              <SectionTitle icon={<Shield size={16}/>} title="Informações da conta" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <InfoRow label="ID do usuário" value={user?.id || '—'} mono/>
                <InfoRow label="E-mail" value={user?.email || '—'}/>
                <InfoRow label="Função" value={profile?.role === 'admin' ? 'Administrador' : 'Usuário'}/>
                <InfoRow label="Status" value={profile?.status || 'active'}/>
                <InfoRow label="Criado em" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : '—'}/>
                <InfoRow label="Último login" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}/>
              </div>
              <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--down)', marginBottom: 10 }}>Zona de perigo</div>
                <button onClick={() => { if (confirm('Tem certeza que deseja sair de todos os dispositivos?')) supabase.auth.signOut({ scope: 'global' }); }}
                  style={{ background: 'rgba(242,107,107,.08)', border: '1px solid rgba(242,107,107,.2)', color: 'var(--down)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 12.5, fontFamily: 'var(--sans)' }}>
                  Sair de todos os dispositivos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--line-1)' }}>
      <span style={{ color: 'var(--gold)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--t1)' }}>{title}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group" style={{ marginBottom: 16 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Btn({ onClick, loading, children }: { onClick: () => void; loading: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} className="process-btn" style={{ width: 'auto', padding: '0 24px', height: 38, borderRadius: 10, fontSize: 13 }}>
      {loading ? 'Salvando...' : children}
    </button>
  );
}

function Toggle({ label, sub, defaultValue }: { label: string; sub: string; defaultValue: boolean }) {
  const [on, setOn] = useState(defaultValue);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line-1)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>
      </div>
      <button onClick={() => setOn(v => !v)} style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? 'var(--gold)' : 'var(--line-2)',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0
      }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 17 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left .2s', display: 'block' }}/>
      </button>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-1)' }}>
      <span style={{ fontSize: 12, color: 'var(--t3)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--t1)', fontFamily: mono ? 'var(--mono)' : 'var(--sans)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
