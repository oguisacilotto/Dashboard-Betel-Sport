import axios from 'axios';
import type { AnalyzeResponse } from '../../src/types';

// ═══════════════════════════════════════════════════
// SCRAPER
// ═══════════════════════════════════════════════════
export async function scrapeUrl(url: string): Promise<string> {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BetelDashboard/2.0)', Accept: 'text/html' },
    responseType: 'text',
  });
  const html: string = res.data;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
    .slice(0, 80000);
  return `[URL: ${url}]\n\n${text}`;
}

// ═══════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════
export async function queryDatabase(connectionString: string, customQuery?: string): Promise<string> {
  const isPostgres = connectionString.startsWith('postgres');
  const isMysql    = connectionString.startsWith('mysql');
  const query      = customQuery || `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 20`;

  if (isPostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });
    try {
      const result = await pool.query(query);
      await pool.end();
      return `[PostgreSQL]\n${JSON.stringify(result.rows, null, 2).slice(0, 80000)}`;
    } catch (e: any) { await pool.end(); throw new Error(`DB error: ${e.message}`); }
  }

  if (isMysql) {
    const mysql = await import('mysql2/promise');
    const conn  = await mysql.createConnection(connectionString);
    try {
      const [rows] = await conn.execute(query);
      await conn.end();
      return `[MySQL]\n${JSON.stringify(rows, null, 2).slice(0, 80000)}`;
    } catch (e: any) { await conn.end(); throw new Error(`DB error: ${e.message}`); }
  }

  throw new Error('Banco não suportado. Use PostgreSQL ou MySQL.');
}

// ═══════════════════════════════════════════════════
// NEXTCLOUD
// ═══════════════════════════════════════════════════
export async function fetchFromNextcloud(remotePath: string): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
  const baseUrl = process.env.NEXTCLOUD_URL!;
  const user    = process.env.NEXTCLOUD_USER!;
  const pass    = process.env.NEXTCLOUD_PASS!;
  const url     = `${baseUrl}/remote.php/dav/files/${user}/${remotePath.replace(/^\//, '')}`;
  const res     = await axios.get(url, { auth: { username: user, password: pass }, responseType: 'arraybuffer', timeout: 30000 });
  const filename = remotePath.split('/').pop() || 'file';
  const mimetype = (res.headers['content-type'] as string) || 'application/octet-stream';
  return { buffer: Buffer.from(res.data), filename, mimetype };
}

// ═══════════════════════════════════════════════════
// TELEGRAM MESSAGE FORMATTER
// ═══════════════════════════════════════════════════
export function buildTelegramMessage(analysis: any, opts: { include_insights?: boolean; include_kpis?: boolean }): string {
  const date = new Date(analysis.created_at).toLocaleDateString('pt-BR');
  let msg = `📊 *${analysis.title}*\n_${date} · Betel Sport_\n━━━━━━━━━━━━━━\n`;

  if (opts.include_kpis && analysis.kpis?.length) {
    analysis.kpis.slice(0, 4).forEach((k: any) => {
      const arrow = k.deltaType === 'up' ? '↑' : k.deltaType === 'down' ? '↓' : '→';
      msg += `${k.label}: *${k.value}*${k.delta ? ` ${arrow} ${k.delta}` : ''}\n`;
    });
    msg += `━━━━━━━━━━━━━━\n`;
  }

  if (opts.include_insights && analysis.insights?.length) {
    msg += `\n*10 Principais Insights:*\n`;
    analysis.insights.forEach((ins: any) => {
      const icon = ins.trend === 'up' ? '📈' : ins.trend === 'down' ? '📉' : '📌';
      msg += `\n${icon} *${ins.id}. ${ins.title}*\n${ins.description}\n`;
    });
    msg += `━━━━━━━━━━━━━━\n`;
  }

  msg += `\n_Betel Sport · Central de Resultados_`;
  return msg;
}
