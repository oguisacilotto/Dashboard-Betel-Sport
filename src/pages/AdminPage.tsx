import { useState, useEffect, useCallback } from 'react';
import { Shield, Mail, Key, Edit2, Check, X, Trash2, RefreshCw, UserCheck, UserX, ChevronDown } from 'lucide-react';
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
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editId, setEditId]         = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [editEmail, setEditEmail]   = useState('');
  const [editRole, setEditRole]     = useState('');
  const [pwdId, setPwdId]           = useState<string | null>(null);
  const [newPwd, setNewPwd]         = useState('');
  const [emailId, setEmailId]       = useState<string | null>(null);
  const [emailSubj, setEmailSubj]   = useState('');
  const [emailBody, setEmailBody]   = useState('');
  const [toast, setToast]           = useState('');
  const [toastType, setToastType]   = useState<'ok'|'err'>('ok');

  const notify = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users');
      const d = await r.json();
      if (r.ok) setUsers(d.users || []);
      else notify(d.message || 'Erro ao carregar usuários', 'err');
    } catch { notify('Erro de conexão', 'err'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const approveUser = async (id: string) => {
    const r = await fetch(`/api/admin/approve/${id}`, { method: 'POST' });
    if (r.ok) { notify('Usuário aprovado!'); fetchUsers(); }
    else notify('Erro ao aprovar', 'err');
  };

  const rejectUser = async (id: string, email: string) => {
    if (!confirm(`Remover ${email}?`)) return;
    const r = await fetch(`/api/admin/reject/${id}`, { method: 'POST' });
    if (r.ok) { notify('Usuário removido'); fetchUsers(); }
    else notify('Erro ao remover', 'err');
  };

  const saveEdit = async (id: string) => {
    const r = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, name: editName, email: editEmail, role: editRole }),
    });
    if (r.ok) { notify('Usuário atualizado!'); setEditId(null); fetchUsers(); }
    else notify('Erro ao atualizar', 'err');
  };

  const savePwd = async (id: string) => {
    if (newPwd.length < 6) { notify('Senha mínima: 6 caracteres', 'err'); return; }
    const r = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, password: newPwd }),
    });
    if (r.ok) { notify('Senha alterada!'); setPwdId(null); setNewPwd(''); }
    else notify('Erro ao alterar senha', 'err');
  };

  const sendEmail = async (id: string) => {
    if (!emailSubj || !emailBody) { notify('Preencha assunto e mensagem', 'err'); return; }
    const r = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, subject: emailSubj, body: emailBody }),
    });
    if (r.ok) { notify('E-mail enviado!'); setEmailId(null); setEmailSubj(''); setEmailBody(''); }
    else notify('Erro ao enviar e-mail', 'err');
  };

  const pending = users.filter(u => u.status === 'pending');
  const active  = users.filter(u => u.status !== 'pending');

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-head" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={20} style={{ color:'var(--gold)' }}/> Gerenciamento de usuários
          </h1>
          <p>Aprovar, editar, redefinir senhas e enviar e-mails</p>
        </div>
        <button className="btn-outline" onClick={fetchUsers} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
          <RefreshCw size={13}/> Atualizar
        </button>
      </div>

      {loading && <div className="page-loading">Carregando...</div>}

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div className="section-label" style={{ marginBottom:10 }}>
            ⏳ Aguardando aprovação ({pending.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pending.map(u => (
              <div key={u.id} className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div className="user-avatar" style={{ width:36, height:36, fontSize:14 }}>
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--t1)' }}>{u.name || '—'}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{u.email}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--t3)' }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </div>
                <button onClick={() => approveUser(u.id)} className="btn-solid" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12 }}>
                  <UserCheck size={13}/> Aprovar
                </button>
                <button onClick={() => rejectUser(u.id, u.email)} style={{ background:'rgba(242,107,107,.1)', border:'1px solid rgba(242,107,107,.2)', color:'var(--down)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                  <UserX size={13}/> Rejeitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active users */}
      <div className="section-label" style={{ marginBottom:10 }}>
        Usuários ativos ({active.length})
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {active.map(u => (
          <div key={u.id} className="card" style={{ padding:0, overflow:'hidden' }}>
            {/* Main row */}
            <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div className="user-avatar" style={{ width:36, height:36, fontSize:14, flexShrink:0 }}>
                {(u.name || u.email)[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                {editId === u.id ? (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Nome"
                      style={{ background:'var(--surface-2)', border:'1px solid var(--line-2)', borderRadius:6, padding:'5px 9px', color:'var(--t1)', fontSize:12, width:160, fontFamily:'var(--sans)' }}/>
                    <input value={editEmail} onChange={e=>setEditEmail(e.target.value)} placeholder="E-mail"
                      style={{ background:'var(--surface-2)', border:'1px solid var(--line-2)', borderRadius:6, padding:'5px 9px', color:'var(--t1)', fontSize:12, width:200, fontFamily:'var(--sans)' }}/>
                    <select value={editRole} onChange={e=>setEditRole(e.target.value)}
                      style={{ background:'var(--surface-2)', border:'1px solid var(--line-2)', borderRadius:6, padding:'5px 9px', color:'var(--t1)', fontSize:12, fontFamily:'var(--sans)' }}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
                      {u.name || '—'}
                      {u.role === 'admin' && <span style={{ background:'var(--gold-dim)', color:'var(--gold)', border:'1px solid rgba(212,168,83,.2)', borderRadius:20, padding:'1px 7px', fontSize:9, fontWeight:600, letterSpacing:'.06em' }}>ADMIN</span>}
                      {u.id === user?.id && <span style={{ background:'rgba(62,207,142,.1)', color:'var(--up)', border:'1px solid rgba(62,207,142,.18)', borderRadius:20, padding:'1px 7px', fontSize:9, fontWeight:600 }}>VOCÊ</span>}
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
                    <button onClick={() => saveEdit(u.id)} style={{ background:'var(--gold)', border:'none', color:'var(--ink)', borderRadius:6, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}><Check size={12}/> Salvar</button>
                    <button onClick={() => setEditId(null)} style={{ background:'var(--surface-3)', border:'1px solid var(--line-2)', color:'var(--t2)', borderRadius:6, padding:'5px 8px', cursor:'pointer' }}><X size={12}/></button>
                  </>
                ) : (
                  <>
                    <button title="Editar" onClick={() => { setEditId(u.id); setEditName(u.name||''); setEditEmail(u.email); setEditRole(u.role||'user'); setPwdId(null); setEmailId(null); }} className="icon-btn"><Edit2 size={13}/></button>
                    <button title="Alterar senha" onClick={() => { setPwdId(pwdId===u.id?null:u.id); setEditId(null); setEmailId(null); setNewPwd(''); }} className="icon-btn"><Key size={13}/></button>
                    <button title="Enviar e-mail" onClick={() => { setEmailId(emailId===u.id?null:u.id); setEditId(null); setPwdId(null); setEmailSubj(''); setEmailBody(''); }} className="icon-btn"><Mail size={13}/></button>
                    {u.id !== user?.id && (
                      <button title="Remover" onClick={() => rejectUser(u.id, u.email)} className="icon-btn danger"><Trash2 size={13}/></button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Password panel */}
            {pwdId === u.id && (
              <div style={{ borderTop:'1px solid var(--line-1)', padding:'12px 20px', background:'var(--surface-2)', display:'flex', gap:8, alignItems:'center' }}>
                <Key size={13} style={{ color:'var(--t3)', flexShrink:0 }}/>
                <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)"
                  style={{ flex:1, background:'var(--surface-3)', border:'1px solid var(--line-2)', borderRadius:6, padding:'7px 10px', color:'var(--t1)', fontSize:12, fontFamily:'var(--sans)', outline:'none' }}/>
                <button onClick={() => savePwd(u.id)} style={{ background:'var(--gold)', border:'none', color:'var(--ink)', borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar</button>
                <button onClick={() => setPwdId(null)} className="icon-btn"><X size={13}/></button>
              </div>
            )}

            {/* Email panel */}
            {emailId === u.id && (
              <div style={{ borderTop:'1px solid var(--line-1)', padding:'14px 20px', background:'var(--surface-2)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <Mail size={13} style={{ color:'var(--t3)' }}/>
                  <span style={{ fontSize:11, color:'var(--t3)' }}>Enviar e-mail para <strong style={{ color:'var(--t1)' }}>{u.email}</strong></span>
                </div>
                <input value={emailSubj} onChange={e=>setEmailSubj(e.target.value)} placeholder="Assunto"
                  style={{ width:'100%', background:'var(--surface-3)', border:'1px solid var(--line-2)', borderRadius:6, padding:'7px 10px', color:'var(--t1)', fontSize:12, fontFamily:'var(--sans)', outline:'none', marginBottom:8 }}/>
                <textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} placeholder="Mensagem..." rows={3}
                  style={{ width:'100%', background:'var(--surface-3)', border:'1px solid var(--line-2)', borderRadius:6, padding:'7px 10px', color:'var(--t1)', fontSize:12, fontFamily:'var(--sans)', outline:'none', resize:'vertical', marginBottom:8 }}/>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => sendEmail(u.id)} style={{ background:'var(--gold)', border:'none', color:'var(--ink)', borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--sans)' }}>Enviar</button>
                  <button onClick={() => setEmailId(null)} className="icon-btn"><X size={13}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toast */}
      <div className="toast" style={{ background: toastType==='err' ? 'rgba(242,107,107,.12)' : undefined, borderColor: toastType==='err' ? 'rgba(242,107,107,.3)' : undefined }} id="admin-toast">
        {toast}
      </div>
      {toast && (
        <style>{`#admin-toast { opacity:1!important; transform:translateY(0)!important; }`}</style>
      )}
    </div>
  );
}
