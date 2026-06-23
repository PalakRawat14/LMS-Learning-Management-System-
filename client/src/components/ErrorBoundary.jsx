import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({ info });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, info: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', color: '#111' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Something went wrong.</h1>
          <p style={{ marginBottom: '1rem' }}>A runtime error prevented the app from rendering.</p>
          {this.state.error && (
            <pre style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
{String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          )}
          {this.state.info && this.state.info.componentStack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Component stack</summary>
              <pre style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
{this.state.info.componentStack}
              </pre>
            </details>
          )}
          <button onClick={this.handleReload} style={{ marginTop: '1.25rem', background: '#2563eb', color: '#fff', padding: '0.6rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
