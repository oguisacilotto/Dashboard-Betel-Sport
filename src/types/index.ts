// ═══════════════════════════════════════════════════
// BETEL SPORT DASHBOARD — TYPES
// ═══════════════════════════════════════════════════

export type SourceType =
  | 'pdf' | 'xlsx' | 'csv' | 'xml'
  | 'url' | 'db' | 'image' | 'audio' | 'video' | 'nextcloud';

export interface Insight {
  id: number;           // 1–10
  title: string;
  description: string;
  value?: string;       // e.g. "R$ 487K"
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;  // e.g. "+12,4%"
  category: string;     // e.g. "financeiro", "operacional"
  editable?: boolean;
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'scatter' | 'funnel';

export interface ChartConfig {
  id: number;           // 1–10 (1–4 visible, 5–10 expandable)
  type: ChartType;
  title: string;
  description?: string;
  data: ChartDataset[];
  insight_ref?: number; // references insight id
  visible: boolean;     // true = first 4, false = expandable
}

export interface ChartDataset {
  label: string;
  values: number[];
  labels: string[];
  color?: string;
}

export interface KPI {
  label: string;
  value: string;
  rawValue: number;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  unit?: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  source_name?: string;
  source_url?: string;
  insights: Insight[];
  charts_config: ChartConfig[];
  kpis: KPI[];
  is_public: boolean;
  public_token: string;
  telegram_sent: boolean;
  telegram_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
  telegram_chat_id?: string;
  telegram_token?: string;
  telegram_enabled: boolean;
}

export interface ShareRecord {
  id: string;
  analysis_id: string;
  channel: 'telegram' | 'pdf' | 'public_link';
  delivered: boolean;
  error_msg?: string;
  created_at: string;
}

// API payloads
export interface AnalyzeRequest {
  type: SourceType;
  text?: string;          // extracted text
  fileBase64?: string;    // for images sent to Claude Vision
  fileName?: string;
  dbConnection?: string;  // connection string for DB sources
  url?: string;           // for URL scraping
  nextcloudPath?: string;
}

export interface AnalyzeResponse {
  insights: Insight[];
  charts: ChartConfig[];
  kpis: KPI[];
  title: string;
}

export interface TelegramSendRequest {
  analysis_id: string;
  include_screenshot: boolean;
  include_kpis: boolean;
  include_insights: boolean;
  include_pdf: boolean;
}
