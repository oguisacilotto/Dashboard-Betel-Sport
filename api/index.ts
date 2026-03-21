import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

dotenv.config();

// ── Lazy-load heavy services to avoid cold-start issues ──
async function getClaude() {
  const { analyzeWithClaude } = await import('./services/claude.js');
  return analyzeWithClaude;
}
async function getParser() {
  const { parseFile } = await import('./services/parser.js');
  return parseFile;
}
async function getServices() {
  const m = await import('./services/services.js');
  return m;
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for production
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (_req.method === 'OPTIONS') return res.status(200).end();
  next();
});

const getAdmin = () => createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Health ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: {
      supabase: !!process.env.VITE_SUPABASE_URL,
      gemini: !!process.env.GEMINI_API_KEY,
      telegram_bot: !!process.env.TELEGRAM_BOT_TOKEN,
      telegram_admin: !!process.env.ADMIN_TELEGRAM_CHAT_ID,
      nextcloud: !!process.env.NEXTCLOUD_URL,
    }
  });
});

// ── Analyze — file upload ─────────────────────────────
app.post('/api/analyze/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    const { type } = req.body;
    const analyzeWithClaude = await getClaude();
    const parseFile = await getParser();
    const { text, base64 } = await parseFile(req.file.buffer, req.file.originalname, req.file.mimetype, type);
    const result = await analyzeWithClaude(text, type, base64);
    res.json(result);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Analyze — URL ─────────────────────────────────────
app.post('/api/analyze/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'URL obrigatória' });
    const analyzeWithClaude = await getClaude();
    const { scrapeUrl } = await getServices();
    const text = await scrapeUrl(url);
    const result = await analyzeWithClaude(text, 'url');
    res.json(result);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Analyze — Database ────────────────────────────────
app.post('/api/analyze/db', async (req, res) => {
  try {
    const { connectionString, query } = req.body;
    if (!connectionString) return res.status(400).json({ message: 'Connection string obrigatória' });
    const analyzeWithClaude = await getClaude();
    const { queryDatabase } = await getServices();
    const text = await queryDatabase(connectionString, query);
    const result = await analyzeWithClaude(text, 'db');
    res.json(result);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Analyze — Nextcloud ───────────────────────────────
app.post('/api/analyze/nextcloud', async (req, res) => {
  try {
    const { path: ncPath } = req.body;
    if (!ncPath) return res.status(400).json({ message: 'Caminho Nextcloud obrigatório' });
    const analyzeWithClaude = await getClaude();
    const parseFile = await getParser();
    const { fetchFromNextcloud } = await getServices();
    const { buffer, filename, mimetype } = await fetchFromNextcloud(ncPath);
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const { text, base64 } = await parseFile(buffer, filename, mimetype, ext);
    const result = await analyzeWithClaude(text, 'nextcloud', base64);
    res.json(result);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Telegram — send report ────────────────────────────
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { analysis_id, include_insights, include_kpis } = req.body;
    const supabase = getAdmin();
    const { buildTelegramMessage } = await getServices();
    const { data: analysis, error } = await supabase.from('analyses').select('*').eq('id', analysis_id).single();
    if (error || !analysis) return res.status(404).json({ message: 'Análise não encontrada' });
    const { data: profile } = await supabase.from('profiles').select('telegram_chat_id, telegram_token').eq('id', analysis.user_id).single();
    if (!profile?.telegram_chat_id || !profile?.telegram_token) return res.status(400).json({ message: 'Telegram não configurado. Configure na aba Telegram.' });
    const message = buildTelegramMessage(analysis, { include_insights, include_kpis });
    const r = await axios.post(
      `https://api.telegram.org/bot${profile.telegram_token}/sendMessage`,
      { chat_id: profile.telegram_chat_id, text: message, parse_mode: 'Markdown' },
      { timeout: 10000 }
    );
    await supabase.from('share_history').insert({ analysis_id, user_id: analysis.user_id, channel: 'telegram', delivered: r.data.ok });
    await supabase.from('analyses').update({ telegram_sent: true }).eq('id', analysis_id);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Telegram — screenshot ─────────────────────────────
app.post('/api/telegram/screenshot', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem' });
    const { analysis_id } = req.body;
    const supabase = getAdmin();
    const { data: analysis } = await supabase.from('analyses').select('user_id, title').eq('id', analysis_id).single();
    if (!analysis) return res.status(404).json({ message: 'Análise não encontrada' });
    const { data: profile } = await supabase.from('profiles').select('telegram_chat_id, telegram_token').eq('id', analysis.user_id).single();
    if (!profile?.telegram_chat_id || !profile?.telegram_token) return res.status(400).json({ message: 'Telegram não configurado' });
    const form = new FormData();
    form.append('chat_id', profile.telegram_chat_id);
    form.append('caption', `📊 *${analysis.title}*\n_Betel Sport · Central de Resultados_`);
    form.append('parse_mode', 'Markdown');
    form.append('photo', req.file.buffer, { filename: 'dashboard.png', contentType: 'image/png' });
    await axios.post(`https://api.telegram.org/bot${profile.telegram_token}/sendPhoto`, form, { headers: form.getHeaders(), timeout: 15000 });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Vercel handler export ─────────────────────────────
export default (req: VercelRequest, res: VercelResponse) => app(req as any, res as any);

// ═══════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════

// ── List all users (admin only) ───────────────────
app.get('/api/admin/users', async (req, res) => {
  try {
    const supabase = getAdmin();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ message: error.message });

    const { data: profiles } = await supabase.from('profiles').select('*');
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

    const result = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: profileMap[u.id]?.name || u.user_metadata?.name || '',
      role: profileMap[u.id]?.role || 'user',
      status: profileMap[u.id]?.status || 'pending',
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }));

    res.json({ users: result });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Promote user to admin ──────────────────────────
app.post('/api/admin/promote', async (req, res) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id obrigatório' });
    const supabase = getAdmin();
    await supabase.from('profiles').update({ role: role || 'admin' }).eq('id', user_id);
    res.json({ ok: true, message: `Usuário promovido a ${role || 'admin'}` });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Approve / reject user ──────────────────────────
app.post('/api/admin/approve', async (req, res) => {
  try {
    const { user_id, approved } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id obrigatório' });
    const supabase = getAdmin();
    await supabase.from('profiles').update({ status: approved ? 'active' : 'rejected' }).eq('id', user_id);
    res.json({ ok: true, status: approved ? 'active' : 'rejected' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Check if email exists ──────────────────────────
app.get('/api/admin/check-user', async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ message: 'email obrigatório' });
    const supabase = getAdmin();
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const found = users.find((u: any) => u.email?.toLowerCase().includes(email.toLowerCase()));
    if (found) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', found.id).single();
      res.json({ found: true, user: { id: found.id, email: found.email, name: profile?.name, role: profile?.role, status: profile?.status, created_at: found.created_at } });
    } else {
      res.json({ found: false });
    }
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Auth — request access (signup sem confirmação de email) ──
app.post('/api/auth/request-access', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    if (password.length < 6) return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });

    const supabase = getAdmin();

    // Check if email already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.find((u: any) => u.email === email);
    if (alreadyExists) return res.status(409).json({ message: 'Este e-mail já possui uma solicitação ou conta cadastrada.' });

    // Create user but do NOT confirm — set banned:false + email_confirmed:false
    // User is created with a pending status via user_metadata
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, status: 'pending' },
    });

    if (createErr) return res.status(500).json({ message: createErr.message });

    // Send Telegram notification to admin
    try {
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
      const botToken    = process.env.TELEGRAM_BOT_TOKEN;

      if (adminChatId && botToken) {
        const approveUrl = `${process.env.VITE_APP_URL || 'https://dashboard-betel-sport.vercel.app'}/api/auth/approve/${userData.user?.id}`;
        const rejectUrl  = `${process.env.VITE_APP_URL || 'https://dashboard-betel-sport.vercel.app'}/api/auth/reject/${userData.user?.id}`;

        const msg = `🔔 *Nova solicitação de acesso*\n\n👤 *Nome:* ${name}\n📧 *E-mail:* ${email}\n🕐 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n✅ [Aprovar acesso](${approveUrl})\n❌ [Rejeitar](${rejectUrl})`;

        await axios.post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          { chat_id: adminChatId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true },
          { timeout: 8000 }
        );
      }
    } catch (teleErr) {
      console.error('Telegram notify error:', teleErr);
      // Don't fail the request if Telegram fails
    }

    res.json({ ok: true, message: 'Solicitação enviada. Aguarde aprovação do administrador.' });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Auth — approve user ───────────────────────────────
app.get('/api/auth/approve/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getAdmin();

    const { error } = await supabase.auth.admin.updateUser(userId, {
      email_confirm: true,
      user_metadata: { status: 'approved' },
    });

    if (error) return res.status(500).send(`<h2>Erro ao aprovar: ${error.message}</h2>`);

    // Notify user by email via Supabase (magic link / custom)
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const userName = user?.user?.user_metadata?.name || 'Usuário';
    const userEmail = user?.user?.email || '';

    // Send Telegram confirmation to admin
    try {
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
      const botToken    = process.env.TELEGRAM_BOT_TOKEN;
      if (adminChatId && botToken) {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: adminChatId,
          text: `✅ Conta de *${userName}* (${userEmail}) foi *aprovada* com sucesso!`,
          parse_mode: 'Markdown',
        }, { timeout: 8000 });
      }
    } catch {}

    res.send(`
      <html><body style="font-family:system-ui;background:#08080c;color:#f0ede8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center;max-width:400px">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="font-family:'Georgia',serif;margin-bottom:8px">Conta aprovada!</h2>
          <p style="color:#8b8990;font-size:14px">A conta de <strong style="color:#d4a853">${userName}</strong> (${userEmail}) foi liberada com sucesso.</p>
          <p style="color:#8b8990;font-size:12px;margin-top:16px">O usuário já pode fazer login em<br/><a href="https://dashboard-betel-sport.vercel.app" style="color:#d4a853">dashboard-betel-sport.vercel.app</a></p>
        </div>
      </body></html>
    `);
  } catch (err: any) { res.status(500).send(`Erro: ${err.message}`); }
});

// ── Auth — reject user ────────────────────────────────
app.get('/api/auth/reject/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getAdmin();
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const userName  = user?.user?.user_metadata?.name || 'Usuário';
    const userEmail = user?.user?.email || '';

    await supabase.auth.admin.deleteUser(userId);

    try {
      const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
      const botToken    = process.env.TELEGRAM_BOT_TOKEN;
      if (adminChatId && botToken) {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: adminChatId,
          text: `❌ Solicitação de *${userName}* (${userEmail}) foi *rejeitada e removida*.`,
          parse_mode: 'Markdown',
        }, { timeout: 8000 });
      }
    } catch {}

    res.send(`
      <html><body style="font-family:system-ui;background:#08080c;color:#f0ede8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center;max-width:400px">
          <div style="font-size:48px;margin-bottom:16px">❌</div>
          <h2 style="font-family:'Georgia',serif;margin-bottom:8px">Solicitação rejeitada</h2>
          <p style="color:#8b8990;font-size:14px">A conta de <strong>${userName}</strong> foi removida.</p>
        </div>
      </body></html>
    `);
  } catch (err: any) { res.status(500).send(`Erro: ${err.message}`); }
});

// ══════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ══════════════════════════════════════════════════

// ── List all users ────────────────────────────────
app.get('/api/admin/users', async (_req, res) => {
  try {
    const supabase = getAdmin();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ message: error.message });

    const users = await Promise.all(data.users.map(async (u: any) => {
      const { data: profile } = await supabase.from('profiles').select('name, role, status').eq('id', u.id).single();
      return {
        id:           u.id,
        email:        u.email,
        name:         profile?.name || u.user_metadata?.name || '',
        role:         profile?.role || 'user',
        status:       u.email_confirmed_at ? (profile?.status || 'active') : 'pending',
        created_at:   u.created_at,
        last_sign_in: u.last_sign_in_at,
      };
    }));

    res.json({ users });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Approve user (POST) ───────────────────────────
app.post('/api/admin/approve/:userId', async (req, res) => {
  try {
    const supabase = getAdmin();
    const { userId } = req.params;
    await supabase.auth.admin.updateUser(userId, { email_confirm: true, user_metadata: { status: 'approved' } });
    await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Reject/delete user (POST) ─────────────────────
app.post('/api/admin/reject/:userId', async (req, res) => {
  try {
    const supabase = getAdmin();
    const { userId } = req.params;
    await supabase.auth.admin.deleteUser(userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Update user info ──────────────────────────────
app.post('/api/admin/update-user', async (req, res) => {
  try {
    const { userId, name, email, role } = req.body;
    const supabase = getAdmin();
    if (email) await supabase.auth.admin.updateUser(userId, { email });
    await supabase.from('profiles').update({ name, role }).eq('id', userId);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Reset password ────────────────────────────────
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const supabase = getAdmin();
    const { error } = await supabase.auth.admin.updateUser(userId, { password });
    if (error) return res.status(500).json({ message: error.message });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Send email to user ────────────────────────────
app.post('/api/admin/send-email', async (req, res) => {
  try {
    const { userId, subject, body } = req.body;
    const supabase = getAdmin();
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user?.user?.email) return res.status(404).json({ message: 'Usuário não encontrado' });

    // Use Supabase inviteUser as email channel — or direct SMTP if configured
    // For now, use Telegram notification as fallback + log
    const botToken   = process.env.TELEGRAM_BOT_TOKEN;
    const adminChat  = process.env.ADMIN_TELEGRAM_CHAT_ID;
    if (botToken && adminChat) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: adminChat,
        text: `📧 *E-mail enviado para ${user.user.email}*\n\n*Assunto:* ${subject}\n\n${body}`,
        parse_mode: 'Markdown',
      }, { timeout: 8000 });
    }

    // Send via Supabase magic link / reset as carrier (best available without SMTP)
    await supabase.auth.admin.inviteUserByEmail(user.user.email, {
      data: { admin_message_subject: subject, admin_message_body: body },
      redirectTo: `${process.env.VITE_APP_URL || 'https://dashboard-betel-sport.vercel.app'}/login`,
    });

    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Promote self to admin (first-time setup) ──────
app.post('/api/admin/promote-self', async (req, res) => {
  try {
    const { userId } = req.body;
    const supabase = getAdmin();
    await supabase.from('profiles').update({ role: 'admin', status: 'active' }).eq('id', userId);
    await supabase.auth.admin.updateUser(userId, {
      email_confirm: true,
      user_metadata: { role: 'admin', status: 'approved' },
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});
