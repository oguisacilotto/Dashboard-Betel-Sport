import { useState, useEffect, useCallback } from 'react';
import { Shield, Mail, Key, Edit2, Check, X, Trash2, RefreshCw, UserCheck, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'users'|'create'>('users');

  // Edit state
  const [editId, setEditId]     = useState<string|null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  // Password state
  const [pwdId, setPwdId]       = useState<string|null>(null);
  const [newPwd, setNewPwd]     = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  // Email state
  const [emailId, setEmailId]   = useState<string|null>(null);
  const [emailSubj, setEmailSubj] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Create user state
  const [newName, setNewName]   = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]   = useState('user');
  const [newShowPwd, setNewShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);

  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState(false);

  const notify = (msg: string, err = false) => {
    setToast(msg); setToastErr(err);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users');
      const d = await r.json();
      if (r.ok) setUsers(d.users || []);
      else notify(d.message || 'Erro ao carregar', true);
    } catch { notify('Erro de conexão', true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const approveUser = async (id: string) => {
    const r = await fetch(`/api/admin/approve/${id}`, { method: 'POST' });
    if (r.ok) { notify('Usuário aprovado!'); fetchUsers(); }
    else notify('Erro ao aprovar', true);
  };

  const rejectUser = async (id: string, email: string) => {
    if (!confirm(`Remover ${email}?`)) return;
    const r = await fetch(`/api/admin/reject/${id}`, { method: 'POST' });
    if (r.ok) { notify('Usuário removido'); fetchUsers(); }
    else notify('Erro ao remover', true);
  };

  const saveEdit = async (id: string) => {
    const r = await fetch('/api/admin/update-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, name: editName, email: editEmail, role: editRole }),
    });
    if (r.ok) { notify('Usuário atualizado!'); setEditId(null); fetchUsers(); }
    else notify('Erro ao atualizar', true);
  };

  const savePwd = async (id: string) => {
    if (newPwd.length < 6) { notify('Mínimo 6 caracteres', true); return; }
    const r = await fetch('/api/admin/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, password: newPwd }),
    });
    if (r.ok) { notify('Senha alterada!'); setPwdId(null); setNewPwd(''); }
    else notify('Erro ao alterar senha', true);
  };

  const sendEmail = async (id: string) => {
    if (!emailSubj || !emailBody) { notify('Preencha assunto e mensagem', true); return; }
    const r = await fetch('/api/admin/send-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, subject: emailSubj, body: emailBody }),
    });
    if (r.ok) { notify('E-mail enviado!'); setEmailId(null); setEmailSubj(''); setEmailBody(''); }
    else notify('Erro ao enviar', true);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) { notify('Preencha todos os campos', true); return; }
    if (newPassword.length < 6) { notify('Senha mínima: 6 caracteres', true); return; }
    setCreating(true);
    try {
      const r = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      });
      const d = await r.json();
      if (r.ok) {
        notify(`Usuário ${newEmail} criado com sucesso!`);
        setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('user');
        setTab('users'); fetchUsers();
      } else notify(d.message || 'Erro ao criar usuário', true);
    } catch { notify('Erro de conexão', true); }
    finally { setCreating(false); }
  };

  const pending = users.filter(u => u.status === 'pending');
  const active  = users.filter(u => u.status !== 'pending');

  const inp: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r8)', padding: '9px 12px', color: 'var(--t1)',
    fontSize: 12.5, outline: 'none', width: '100%', fontFamily: 'var(--sans)',
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={20} style={{ color:'var(--gold)' }}/> Gerenciamento de usuários
          </h1>
          <p>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchUsers} className="btn-outline" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            <RefreshCw size={13}/> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r12)', padding:3, marginBottom:20, width:'fit-content' }}>
        {[
          { id:'users', label:'Lista de usuários', icon: Shield },
          { id:'create', label:'Criar novo usuário', icon: UserPlus },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:'var(--r8)',
            background: tab === t.id ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--t2)',
            border:'none', cursor:'pointer', fontSize:12.5, fontWeight: tab===t.id ? 600 : 400,
            transition:'all .14s', fontFamily:'var(--sans)',
            boxShadow: tab===t.id ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
          }}>
            <t.icon size={13}/> {t.label}
          </button>
        ))}
      </div>

      {/* ── CREATE USER TAB ── */}
      {tab === 'create' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background:'var(--surface-1)', border:'1px solid var(--line-1)', borderRadius:'var(--r16)', padding:28 }}>
            <div style={{ fontFamily:'var(--serif)', fontSize:17, color:'var(--t1)', marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--line-1)', display:'flex', alignItems:'center', gap:8 }}>
              <UserPlus size={16} style={{ color:'var(--gold)' }}/> Criar novo usuário
            </div>
            <form onSubmit={createUser} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="field-group">
                <label>Nome completo</label>
                <input style={inp} type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome do usuário" required/>
              </div>
              <div className="field-group">
                <label>E-mail</label>
                <input style={inp} type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="email@betelsport.com.br" required/>
              </div>
              <div className="field-group">
                <label>Senha inicial</label>
                <div style={{ position:'relative' }}>
                  <input style={{ ...inp, paddingRight:36 }} type={newShowPwd ? 'text' : 'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required/>
                  <button type="button" onClick={() => setNewShowPwd(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex', alignItems:'center' }}>
                    {newShowPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                <span className="field-hint">O usuário poderá alterar a senha após o primeiro acesso</span>
              </div>
              <div className="field-group">
                <label>Função</label>
                <select style={{ ...inp, appearance:'none' }} value={newRole} onChange={e=>setNewRole(e.target.value)}>
                  <option value="user">Usuário padrão</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Role info */}
              <div style={{ background: newRole==='admin' ? 'rgba(139,92,246,.08)' : 'rgba(59,130,246,.07)', border: `1px solid ${newRole==='admin' ? 'rgba(139,92,246,.2)' : 'rgba(59,130,246,.18)'}`, borderRadius:'var(--r8)', padding:'10px 14px', fontSize:12, color:'var(--t2)', lineHeight:1.5 }}>
                {newRole === 'admin'
                  ? '⚡ Administrador tem acesso total: gerenciar usuários, ver todos os dashboards e configurações do sistema.'
                  : '👤 Usuário padrão pode importar dados, gerar dashboards e compartilhar relatórios.'}
              </div>

              <button type="submit" disabled={creating} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'12px', background: creating ? '#1d4ed8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color:'#fff', fontWeight:700, border:'none', borderRadius:'var(--r12)',
                fontSize:13, cursor: creating ? 'not-allowed' : 'pointer',
                boxShadow: creating ? 'none' : '0 0 16px rgba(59,130,246,0.3)',
                fontFamily:'var(--sans)', marginTop:4,
              }}>
                <UserPlus size={14}/>
                {creating ? 'Criando usuário...' : 'Criar usuário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          {loading && <div className="page-loading">Carregando...</div>}

          {/* Pending */}
          {pending.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div className="section-label" style={{ marginBottom:10 }}>⏳ Aguardando aprovação ({pending.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pending.map(u => (
                  <div key={u.id} className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                    <div className="user-avatar">{(u.name||u.email)[0].toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--t1)' }}>{u.name||'—'}</div>
                      <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                    <button onClick={() => approveUser(u.id)} className="btn-solid" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', fontSize:12, height:'auto' }}>
                      <UserCheck size={13}/> Aprovar
                    </button>
                    <button onClick={() => rejectUser(u.id, u.email)} style={{ background:'rgba(244,63,94,.1)', border:'1px solid rgba(244,63,94,.2)', color:'var(--down)', borderRadius:'var(--r8)', padding:'6px 12px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:'var(--sans)' }}>
                      <UserX size={13}/> Rejeitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active users */}
          <div className="section-label" style={{ marginBottom:10 }}>Usuários ativos ({active.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {active.map(u => (
              <div key={u.id} className="card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                  <div className="user-avatar" style={{ flexShrink:0 }}>{(u.name||u.email)[0].toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {editId === u.id ? (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Nome" style={{ ...inp, width:160, padding:'5px 9px', fontSize:12 }}/>
                        <input value={editEmail} onChange={e=>setEditEmail(e.target.value)} placeholder="E-mail" style={{ ...inp, width:200, padding:'5px 9px', fontSize:12 }}/>
                        <select value={editRole} onChange={e=>setEditRole(e.target.value)} style={{ ...inp, width:'auto', padding:'5px 9px', fontSize:12, appearance:'none' }}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
                          {u.name||'—'}
                          {u.role==='admin' && <span style={{ background:'rgba(59,130,246,.15)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.2)', borderRadius:20, padding:'1px 7px', fontSize:9, fontWeight:600, letterSpacing:'.06em' }}>ADMIN</span>}
                          {u.id===user?.id && <span style={{ background:'rgba(16,185,129,.1)', color:'var(--up)', border:'1px solid rgba(16,185,129,.18)', borderRadius:20, padding:'1px 7px', fontSize:9, fontWeight:600 }}>VOCÊ</span>}
                        </div>
                        <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{u.email}</div>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', textAlign:'right', flexShrink:0 }}>
                    <div>{new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                    {u.last_sign_in && <div style={{ marginTop:2 }}>último: {new Date(u.last_sign_in).toLocaleDateString('pt-BR')}</div>}
                  </div>
                  <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                    {editId === u.id ? (
                      <>
                        <button onClick={()=>saveEdit(u.id)} style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', borderRadius:6, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, fontFamily:'var(--sans)' }}><Check size={12}/> Salvar</button>
                        <button onClick={()=>setEditId(null)} className="icon-btn"><X size={12}/></button>
                      </>
                    ) : (
                      <>
                        <button title="Editar" onClick={()=>{ setEditId(u.id); setEditName(u.name||''); setEditEmail(u.email); setEditRole(u.role||'user'); setPwdId(null); setEmailId(null); }} className="icon-btn"><Edit2 size={13}/></button>
                        <button title="Alterar senha" onClick={()=>{ setPwdId(pwdId===u.id?null:u.id); setEditId(null); setEmailId(null); setNewPwd(''); setShowPwd(false); }} className="icon-btn"><Key size={13}/></button>
                        <button title="Enviar e-mail" onClick={()=>{ setEmailId(emailId===u.id?null:u.id); setEditId(null); setPwdId(null); setEmailSubj(''); setEmailBody(''); }} className="icon-btn"><Mail size={13}/></button>
                        {u.id !== user?.id && (
                          <button title="Remover" onClick={()=>rejectUser(u.id, u.email)} className="icon-btn danger"><Trash2 size={13}/></button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Password panel */}
                {pwdId === u.id && (
                  <div style={{ borderTop:'1px solid var(--line-1)', padding:'12px 20px', background:'var(--surface-2)', display:'flex', gap:8, alignItems:'center' }}>
                    <Key size={13} style={{ color:'var(--t3)', flexShrink:0 }}/>
                    <div style={{ position:'relative', flex:1 }}>
                      <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e=>setNewPwd(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        style={{ ...inp, paddingRight:36 }}/>
                      <button onClick={()=>setShowPwd(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex', alignItems:'center' }}>
                        {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                    <button onClick={()=>savePwd(u.id)} style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', borderRadius:'var(--r8)', padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--sans)', whiteSpace:'nowrap' }}>Salvar senha</button>
                    <button onClick={()=>setPwdId(null)} className="icon-btn"><X size={13}/></button>
                  </div>
                )}

                {/* Email panel */}
                {emailId === u.id && (
                  <div style={{ borderTop:'1px solid var(--line-1)', padding:'14px 20px', background:'var(--surface-2)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, fontSize:11, color:'var(--t3)' }}>
                      <Mail size={13}/> Enviar e-mail para <strong style={{ color:'var(--t1)' }}>{u.email}</strong>
                    </div>
                    <input value={emailSubj} onChange={e=>setEmailSubj(e.target.value)} placeholder="Assunto" style={{ ...inp, marginBottom:8 }}/>
                    <textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} placeholder="Mensagem..." rows={3} style={{ ...inp, resize:'vertical', marginBottom:8 }}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>sendEmail(u.id)} style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', borderRadius:'var(--r8)', padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--sans)' }}>Enviar</button>
                      <button onClick={()=>setEmailId(null)} className="icon-btn"><X size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:99,
          background: toastErr ? 'rgba(244,63,94,.12)' : 'var(--surface-3)',
          border: `1px solid ${toastErr ? 'rgba(244,63,94,.3)' : 'var(--line-2)'}`,
          borderRadius:'var(--r12)', padding:'12px 16px',
          fontSize:12.5, color: toastErr ? '#fb7185' : 'var(--t1)',
          boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          animation:'fadeUp .3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
