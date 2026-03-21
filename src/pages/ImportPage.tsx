import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link, Database, Cloud, FileText, Image, Volume2, Video, Send } from 'lucide-react';
import { analyzeFile, analyzeUrl, analyzeDb, analyzeNextcloud } from '../lib/api';
import { createAnalysis } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { SourceType } from '../types';

type Step = 'source' | 'configure' | 'processing' | 'done';

const SOURCES: { type: SourceType; label: string; icon: any; desc: string; accept?: string }[] = [
  { type: 'pdf',       label: 'PDF',         icon: FileText, desc: 'Relatórios, propostas, documentos', accept: '.pdf' },
  { type: 'xlsx',      label: 'Excel / CSV', icon: FileText, desc: 'Planilhas de dados e métricas',     accept: '.xlsx,.xls,.csv' },
  { type: 'xml',       label: 'XML',         icon: FileText, desc: 'Dados estruturados em XML',         accept: '.xml' },
  { type: 'image',     label: 'Imagem',      icon: Image,    desc: 'JPG, PNG — IA lê visualmente',     accept: 'image/*' },
  { type: 'audio',     label: 'Áudio',       icon: Volume2,  desc: 'Reuniões, apresentações faladas',  accept: 'audio/*' },
  { type: 'video',     label: 'Vídeo',       icon: Video,    desc: 'Transcrição de conteúdo falado',   accept: 'video/*' },
  { type: 'url',       label: 'Site / URL',  icon: Link,     desc: 'Analisa qualquer página web' },
  { type: 'db',        label: 'Banco de dados', icon: Database, desc: 'MySQL / PostgreSQL via connection string' },
  { type: 'nextcloud', label: 'Nextcloud',   icon: Cloud,    desc: 'Arquivo do seu Nextcloud pessoal' },
];

export default function ImportPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [dbConn, setDbConn] = useState('');
  const [dbQuery, setDbQuery] = useState('');
  const [ncPath, setNcPath] = useState('');
  const [template, setTemplate] = useState('geral');
  const [telegramEnabled, setTelegramEnabled] = useState(profile?.telegram_enabled ?? true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const selectedSource = SOURCES.find(s => s.type === sourceType);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleProcess = async () => {
    if (!user) return;
    setStep('processing');
    setError('');

    try {
      setProgress('Enviando arquivo para análise...');
      let result;

      if (sourceType === 'url') {
        setProgress('Lendo conteúdo do site...');
        result = await analyzeUrl(url);
      } else if (sourceType === 'db') {
        setProgress('Consultando banco de dados...');
        result = await analyzeDb(dbConn, dbQuery);
      } else if (sourceType === 'nextcloud') {
        setProgress('Buscando arquivo no Nextcloud...');
        result = await analyzeNextcloud(ncPath);
      } else if (file) {
        setProgress('Analisando arquivo com IA...');
        result = await analyzeFile(file, sourceType!);
      } else {
        throw new Error('Nenhuma fonte de dados selecionada');
      }

      setProgress('Salvando análise...');
      const { data: saved, error: saveErr } = await createAnalysis({
        user_id: user.id,
        title: result.title,
        source_type: sourceType!,
        source_name: file?.name || url || ncPath || 'banco de dados',
        insights: result.insights as any,
        charts_config: result.charts as any,
        kpis: result.kpis as any,
        telegram_enabled: telegramEnabled,
      });

      if (saveErr) throw saveErr;

      // Auto-send Telegram if enabled
      if (telegramEnabled && profile?.telegram_chat_id) {
        setProgress('Enviando relatório ao Telegram...');
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysis_id: saved.id,
            include_insights: true,
            include_kpis: true,
          }),
        });
      }

      setStep('done');
      setTimeout(() => navigate(`/dashboard/${saved.id}`), 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar');
      setStep('configure');
    }
  };

  // ── Step: source selection ────────────────────────────
  if (step === 'source') {
    return (
      <div className="import-page">
        <div className="page-head">
          <h1>Importar dados</h1>
          <p>Escolha a fonte de dados para análise com IA</p>
        </div>

        <div className="source-grid">
          {SOURCES.map(s => (
            <button key={s.type} className="source-card" onClick={() => { setSourceType(s.type); setStep('configure'); }}>
              <s.icon size={20} />
              <div className="source-label">{s.label}</div>
              <div className="source-desc">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: configure ───────────────────────────────────
  if (step === 'configure') {
    const isFile = !['url', 'db', 'nextcloud'].includes(sourceType!);
    const canProceed = isFile ? !!file : sourceType === 'url' ? !!url : sourceType === 'db' ? !!dbConn : !!ncPath;

    return (
      <div className="import-page">
        <div className="page-head">
          <button className="back-btn" onClick={() => setStep('source')}>← Voltar</button>
          <h1>{selectedSource?.label}</h1>
          <p>{selectedSource?.desc}</p>
        </div>

        <div className="configure-card">
          {/* File sources */}
          {isFile && (
            <div
              className={`dropzone ${dragOver ? 'dragover' : ''} ${file ? 'has-file' : ''}`}
              onClick={() => document.getElementById('file-inp')?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input id="file-inp" type="file" accept={selectedSource?.accept} style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              {file ? (
                <div className="file-selected">
                  <FileText size={24} />
                  <span>{file.name}</span>
                  <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <>
                  <Upload size={28} />
                  <div className="drop-title">Arraste ou clique para selecionar</div>
                  <div className="drop-sub">Suportado: {selectedSource?.accept?.replace(/\./g, '').toUpperCase()}</div>
                </>
              )}
            </div>
          )}

          {/* URL */}
          {sourceType === 'url' && (
            <div className="field-group">
              <label>URL do site</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://exemplo.com/pagina" className="field-input" />
            </div>
          )}

          {/* DB */}
          {sourceType === 'db' && (
            <>
              <div className="field-group">
                <label>String de conexão</label>
                <input type="password" value={dbConn} onChange={e => setDbConn(e.target.value)}
                  placeholder="postgresql://user:pass@host:5432/db" className="field-input" />
                <span className="field-hint">Suportado: PostgreSQL, MySQL</span>
              </div>
              <div className="field-group">
                <label>Query personalizada <span className="optional">(opcional)</span></label>
                <textarea value={dbQuery} onChange={e => setDbQuery(e.target.value)}
                  placeholder="SELECT * FROM vendas WHERE created_at > '2026-01-01' LIMIT 500"
                  className="field-input" rows={3} />
              </div>
            </>
          )}

          {/* Nextcloud */}
          {sourceType === 'nextcloud' && (
            <div className="field-group">
              <label>Caminho no Nextcloud</label>
              <input type="text" value={ncPath} onChange={e => setNcPath(e.target.value)}
                placeholder="relatorios/marco-2026.xlsx" className="field-input" />
              <span className="field-hint">drive.betelsport.com.br</span>
            </div>
          )}

          {/* Telegram toggle */}
          <div className="telegram-toggle">
            <div className="tele-info">
              <Send size={15} />
              <div>
                <div className="tele-title">Enviar ao Telegram após análise</div>
                <div className="tele-sub">10 insights + KPIs serão enviados automaticamente</div>
              </div>
            </div>
            <button
              className={`toggle-btn ${telegramEnabled ? 'on' : ''}`}
              onClick={() => setTelegramEnabled(v => !v)}
            >
              <span className="toggle-dot" />
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button className="process-btn" disabled={!canProceed} onClick={handleProcess}>
            Analisar com IA
          </button>
        </div>
      </div>
    );
  }

  // ── Step: processing ──────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="import-page center">
        <div className="processing-card">
          <div className="ai-icon">✦</div>
          <div className="processing-title">Analisando com IA</div>
          <div className="processing-sub">{progress}</div>
          <div className="progress-rail"><div className="progress-fill" /></div>
        </div>
      </div>
    );
  }

  // ── Step: done ────────────────────────────────────────
  return (
    <div className="import-page center">
      <div className="done-card">
        <div className="done-icon">✓</div>
        <div className="done-title">Análise concluída</div>
        <div className="done-sub">Redirecionando para o dashboard...</div>
      </div>
    </div>
  );
}
