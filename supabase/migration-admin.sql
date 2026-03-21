-- ── Adiciona coluna status em profiles ────────────────
alter table public.profiles 
  add column if not exists status text default 'active';

-- Por padrão todas as contas existentes ficam 'active'
-- Novos usuários podem ser 'pending' se admin approval for obrigatório
update public.profiles set status = 'active' where status is null;

-- ── Índice para busca por status ──────────────────────
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);
