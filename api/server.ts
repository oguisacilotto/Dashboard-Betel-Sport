import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { createClient } from '@supabase/supabase-js';
import { analyzeWithClaude } from './services/claude';
import { parseFile } from './services/parser';
import { scrapeUrl, queryDatabase, fetchFromNextcloud, buildTelegramMessage } from './services/services';

dotenv.config();

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.get('/api/health', (_, res) => res.json({ ok: true, version: '2.0.0' }));

app.post('/api/analyze/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    const { buffer, originalname, mimetype } = req.file;
    const { text, base64 } = await parseFile(buffer, originalname, mimetype);
    const result = await analyzeWithClaude(text, req.body.type || 'file', base64);
    res.json(result);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/analyze/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'URL obrigatória' });
    const r = await axios.get(url, { timeout: 15000, responseType: 'text', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = (r.data as string)
      .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n\n').trim().slice(0, 80000);
    res.json(await analyzeWithClaude(`[URL: ${url}]\n\n${text}`, 'url'));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/analyze/db', async (req, res) => {
  try {
    const { connectionString, query } = req.body;
    if (!connectionString) return res.status(400).json({ message: 'Connection string obrigatória' });
    const q = query || 'SELECT table_name FROM information_schema.tables LIMIT 20';
    let text = '';
    if (connectionString.startsWith('postgres')) {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });
      const r = await pool.query(q); await pool.end();
      text = `[PostgreSQL]\n${JSON.stringify(r.rows, null, 2).slice(0, 80000)}`;
    } else if (connectionString.startsWith('mysql')) {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(connectionString);
      const [rows] = await conn.execute(q); await conn.end();
      text = `[MySQL]\n${JSON.stringify(rows, null, 2).slice(0, 80000)}`;
    } else return res.status(400).json({ message: 'Use PostgreSQL ou MySQL' });
    res.json(await analyzeWithClaude(text, 'db'));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/analyze/nextcloud', async (req, res) => {
  try {
    const { path: ncPath } = req.body;
    if (!ncPath) return res.status(400).json({ message: 'Caminho obrigatório' });
    const url = `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}/${ncPath.replace(/^\//, '')}`;
    const r = await axios.get(url, {
      auth: { username: process.env.NEXTCLOUD_USER!, password: process.env.NEXTCLOUD_PASS! },
      responseType: 'arraybuffer', timeout: 30000,
    });
    const filename = ncPath.split('/').pop() || 'file';
    const { text, base64 } = await parseFile(Buffer.from(r.data), filename, r.headers['content-type'] as string || 'application/octet-stream');
    res.json(await analyzeWithClaude(text, 'nextcloud', base64));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/telegram/send', async (req, res) => {
  try {
    const { analysis_id, include_insights, include_kpis } = req.body;
    const { data: analysis } = await supabase.from('analyses').select('*').eq('id', analysis_id).single();
    if (!analysis) return res.status(404).json({ message: 'Análise não encontrada' });
    const { data: profile } = await supabase.from('profiles').select('telegram_chat_id, telegram_token').eq('id', analysis.user_id).single();
    if (!profile?.telegram_chat_id || !profile?.telegram_token) return res.status(400).json({ message: 'Telegram não configurado' });
    const date = new Date(analysis.created_at).toLocaleDateString('pt-BR');
    let msg = `📊 *${analysis.title}*\n_${date} · Betel Sport_\n━━━━━━━━━━━━━━\n`;
    if (include_kpis && analysis.kpis?.length) {
      analysis.kpis.slice(0, 4).forEach((k: any) => {
        const a = k.deltaType === 'up' ? '↑' : k.deltaType === 'down' ? '↓' : '→';
        msg += `${k.label}: *${k.value}*${k.delta ? ` ${a} ${k.delta}` : ''}\n`;
      });
      msg += `━━━━━━━━━━━━━━\n`;
    }
    if (include_insights && analysis.insights?.length) {
      msg += `\n*10 Principais Insights:*\n`;
      analysis.insights.forEach((ins: any) => {
        const icon = ins.trend === 'up' ? '📈' : ins.trend === 'down' ? '📉' : '📌';
        msg += `\n${icon} *${ins.id}. ${ins.title}*\n${ins.description}\n`;
      });
    }
    msg += `\n_Central de Resultados · Betel Sport_`;
    await axios.post(`https://api.telegram.org/bot${profile.telegram_token}/sendMessage`, { chat_id: profile.telegram_chat_id, text: msg, parse_mode: 'Markdown' }, { timeout: 10000 });
    await supabase.from('share_history').insert({ analysis_id, user_id: analysis.user_id, channel: 'telegram', delivered: true });
    await supabase.from('analyses').update({ telegram_sent: true }).eq('id', analysis_id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post('/api/telegram/screenshot', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Imagem obrigatória' });
    const { analysis_id } = req.body;
    const { data: analysis } = await supabase.from('analyses').select('user_id, title').eq('id', analysis_id).single();
    if (!analysis) return res.status(404).json({ message: 'Análise não encontrada' });
    const { data: profile } = await supabase.from('profiles').select('telegram_chat_id, telegram_token').eq('id', analysis.user_id).single();
    if (!profile?.telegram_chat_id || !profile?.telegram_token) return res.status(400).json({ message: 'Telegram não configurado' });
    const form = new FormData();
    form.append('chat_id', profile.telegram_chat_id);
    form.append('caption', `📊 *${analysis.title}*\n_Betel Sport_`);
    form.append('parse_mode', 'Markdown');
    form.append('photo', req.file.buffer, { filename: 'dashboard.png', contentType: 'image/png' });
    await axios.post(`https://api.telegram.org/bot${profile.telegram_token}/sendPhoto`, form, { headers: form.getHeaders(), timeout: 15000 });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default app;
