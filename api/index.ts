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
  const { analyzeWithClaude } = await import('./services/claude');
  return analyzeWithClaude;
}
async function getParser() {
  const { parseFile } = await import('./services/parser');
  return parseFile;
}
async function getServices() {
  const m = await import('./services/services');
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
      anthropic: !!process.env.ANTHROPIC_API_KEY,
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
