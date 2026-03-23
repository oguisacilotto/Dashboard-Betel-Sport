import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#040608',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: 24,
        }}>
          <div style={{
            maxWidth: 480, width: '100%',
            background: '#0b1018',
            border: '1px solid rgba(244,63,94,.25)',
            borderRadius: 20, padding: '36px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontSize: 20, color: '#e8f0fe',
              marginBottom: 10,
            }}>
              Algo deu errado
            </div>
            <div style={{ fontSize: 13, color: '#7a92b4', marginBottom: 8, lineHeight: 1.5 }}>
              Ocorreu um erro inesperado no sistema.
            </div>
            <div style={{
              background: 'rgba(244,63,94,.07)',
              border: '1px solid rgba(244,63,94,.15)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 11.5, color: '#f87171',
              fontFamily: 'monospace', textAlign: 'left',
              marginBottom: 24, wordBreak: 'break-all',
              maxHeight: 80, overflow: 'hidden',
            }}>
              {this.state.error.message}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', color: '#fff',
                  borderRadius: 10, padding: '10px 20px',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: 'system-ui',
                  boxShadow: '0 0 16px rgba(59,130,246,.35)',
                }}
              >
                Recarregar página
              </button>
              <button
                onClick={() => { window.location.href = '/import'; }}
                style={{
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.12)',
                  color: '#7a92b4', borderRadius: 10,
                  padding: '10px 20px', cursor: 'pointer',
                  fontSize: 13, fontFamily: 'system-ui',
                }}
              >
                Ir para início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
