import { useState, useEffect } from 'react';
import { Shield, Check, X, Crown, User, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in?: string;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers]   = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch { showToast('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const promote = async (user_id: string, role: string) => {
    await fetch('/api/admin/promote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, role }) });
    showToast(`Usuário promovido a ${role}!`);
    loadUsers();
  };

  const approve = async (user_id: string, approved: boolean) => {
    await fetch('/api/admin/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id, approved }) });
    showToast(approved ? 'Conta aprovada!' : 'Conta rejeitada.');
    loadUsers();
  };

  if (profile?.role !== 'admin') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:'12px' }}>
        <Shield size={32} color="#4e4d52"/>
        <div style={{ fontSize:'14px', color:'var(--t2)' }}>Acesso restrito a administradores</div>
      </div>
    );
  }

  const statusColor = (s: string) => s === 'active' ? 'var(--up)' : s === 'rejected' ? 'var(--down)' : 'var(--warn)';
  const statusLabel = (s: string) => s === 'active' ? 'Ativo' : s === 'rejected' ? 'Rejeitado' : 'Pendente';
  const roleLabel   = (r: string) => r === 'admin' ? 'Admin' : 'Usuário';

  return (
    <div>
      <div className="page-head">
        <h1>Gerenciamento de usuários</h1>
        <p>{users.length} conta{users.length !== 1 ? 's' : ''} registrada{users.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="page-loading">Carregando usuários...</div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Função</th>
                <th>Status</th>
                <th>Cadastro</th>
                <th style={{ textAlign:'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight:500, color:'var(--t1)' }}>{u.name || '—'}</div>
                    <div style={{ fontSize:'11px', color:'var(--t3)', marginTop:'2px' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className="pill" style={{ background: u.role==='admin' ? 'rgba(212,168,83,.1)' : 'var(--surface-2)', color: u.role==='admin' ? 'var(--gold)' : 'var(--t2)' }}>
                      {u.role === 'admin' ? <Crown size={10}/> : <User size={10}/>}
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span className="pill" style={{ background: `${statusColor(u.status)}18`, color: statusColor(u.status) }}>
                      <span className="pill-dot" style={{ background: statusColor(u.status) }}/>
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td style={{ fontSize:'11px', color:'var(--t3)', fontFamily:'var(--mono)' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}>
                      {u.status === 'pending' && <>
                        <button className="btn btn-outline" style={{ height:'28px', padding:'0 10px', fontSize:'11px', color:'var(--up)', borderColor:'rgba(62,207,142,.3)' }} onClick={() => approve(u.id, true)}>
                          <Check size={12}/> Aprovar
                        </button>
                        <button className="btn btn-outline" style={{ height:'28px', padding:'0 10px', fontSize:'11px', color:'var(--down)', borderColor:'rgba(242,107,107,.3)' }} onClick={() => approve(u.id, false)}>
                          <X size={12}/> Rejeitar
                        </button>
                      </>}
                      {u.role !== 'admin' && (
                        <button className="btn btn-outline" style={{ height:'28px', padding:'0 10px', fontSize:'11px', color:'var(--gold)', borderColor:'rgba(212,168,83,.3)' }} onClick={() => promote(u.id, 'admin')}>
                          <Crown size={12}/> Admin
                        </button>
                      )}
                      {u.role === 'admin' && (
                        <button className="btn btn-outline" style={{ height:'28px', padding:'0 10px', fontSize:'11px' }} onClick={() => promote(u.id, 'user')}>
                          <User size={12}/> Usuário
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
