import React, { StrictMode, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './styles/base.css'
import './index.css'
// Lazy import App for better surfacing of module load failures
const LazyApp = React.lazy(() => {
  console.log('[LazyApp] importing App.jsx');
  return import('./App.jsx');
});
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Global runtime error logging (helps when white screen appears before UI mounts)
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise Rejection]', e.reason);
});

function MountMarker() {
  useEffect(() => {
    const r = document.getElementById('root');
    if (r) {
      r.dataset.reactMounted = 'true';
      console.log('[MountMarker] Root marked mounted');
    }
  }, []);
  return null;
}

const BootFallback = () => (
  <div style={{padding:'2rem',fontFamily:'system-ui'}}>
    <h2 style={{margin:'0 0 0.75rem',fontSize:'1.25rem'}}>Loading interface…</h2>
    <p style={{margin:0,opacity:0.65}}>Preparing application shell…</p>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MountMarker />
          <Suspense fallback={<BootFallback />}> 
            <LazyApp />
          </Suspense>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)

// Detect mount stall
setTimeout(() => {
  const root = document.getElementById('root');
  if (root && !root.dataset.reactMounted) {
    if (!document.getElementById('diagnostic-root-timeout')) {
      const div = document.createElement('div');
      div.id = 'diagnostic-root-timeout';
      div.style.cssText = 'position:fixed;top:8px;left:8px;background:#b91c1c;color:#fff;padding:12px 16px;font-family:monospace;font-size:13px;z-index:99999;border-radius:6px;max-width:340px;';
      div.innerHTML = '<strong>Startup stalled</strong><br/>React root did not mount. Check console for first error.';
      document.body.appendChild(div);
    }
  }
}, 3000);
