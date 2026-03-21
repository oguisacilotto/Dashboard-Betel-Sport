import type { AnalyzeRequest, AnalyzeResponse, TelegramSendRequest } from '../types';

const BASE = '/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

// ── Analysis ──────────────────────────────────────────
export const analyzeText = (payload: AnalyzeRequest): Promise<AnalyzeResponse> =>
  post('/analyze', payload);

export const analyzeFile = (file: File, type: string): Promise<AnalyzeResponse> => {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  return postForm('/analyze/file', form);
};

export const analyzeUrl = (url: string): Promise<AnalyzeResponse> =>
  post('/analyze/url', { url });

export const analyzeDb = (connectionString: string, query?: string): Promise<AnalyzeResponse> =>
  post('/analyze/db', { connectionString, query });

export const analyzeNextcloud = (path: string): Promise<AnalyzeResponse> =>
  post('/analyze/nextcloud', { path });

// ── Telegram ──────────────────────────────────────────
export const sendTelegramReport = (payload: TelegramSendRequest): Promise<{ ok: boolean }> =>
  post('/telegram/send', payload);

// ── Screenshot ────────────────────────────────────────
export const captureAndSendTelegram = async (
  elementId: string,
  analysisId: string
): Promise<{ ok: boolean }> => {
  const { domToPng } = await import('modern-screenshot');
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Element not found');
  const dataUrl = await domToPng(el, { scale: 2, quality: 0.95 });
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('image', blob, 'dashboard.png');
  form.append('analysis_id', analysisId);
  return postForm('/telegram/screenshot', form);
};
