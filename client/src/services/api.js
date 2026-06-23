import axios from 'axios';

// ---- Dynamic Port & Base URL Resolution ----
// Priority order:
// 1. Explicit VITE_API_URL (skip probing)
// 2. Cached sessionStorage value (validated quickly)
// 3. Candidate port list from VITE_API_PORTS (comma) or VITE_API_PORT_RANGE (start-end) or default

const explicitUrl = import.meta.env.VITE_API_URL;
const cached = !explicitUrl && sessionStorage.getItem('api.base');

function buildCandidatePorts() {
  if (explicitUrl) return [];
  if (import.meta.env.VITE_API_PORTS) {
    return import.meta.env.VITE_API_PORTS.split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !Number.isNaN(p));
  }
  if (import.meta.env.VITE_API_PORT_RANGE) {
    const m = /(\d+)-(\d+)/.exec(import.meta.env.VITE_API_PORT_RANGE.trim());
    if (m) {
      const s = parseInt(m[1], 10); const e = parseInt(m[2], 10);
      if (e >= s && e - s <= 100) {
        return Array.from({ length: e - s + 1 }, (_, i) => s + i);
      }
    }
  }
  return [5000, 5001, 5002, 5003, 5004];
}

const candidatePorts = buildCandidatePorts();
let dynamicResolved = false;
let baseURL = explicitUrl || cached || 'http://localhost:5000/api';
let resolvingPromise = null;

async function probePort(port) {
  // Probe with a short timeout to avoid long hangs when ports are unreachable
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch(`http://localhost:${port}/api/ping`, { method: 'GET', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    clearTimeout(timeout);
    return false;
  }
}

async function resolveDynamicBase() {
  if (dynamicResolved || explicitUrl) return baseURL;

  // Validate cached first if present
  if (cached) {
    const url = new URL(cached);
    const port = url.port || '5000';
    if (await probePort(port)) {
      dynamicResolved = true;
      console.log('[api] using cached backend ->', baseURL);
      return baseURL;
    } else {
      console.warn('[api] cached backend unreachable, re-probing');
    }
  }

  for (const p of candidatePorts) {
    if (await probePort(p)) {
      baseURL = `http://localhost:${p}/api`;
      dynamicResolved = true;
      sessionStorage.setItem('api.base', baseURL);
      console.log('[api] dynamic backend resolved ->', baseURL);
      api.defaults.baseURL = baseURL;
      return baseURL;
    }
  }
  console.warn('[api] No backend detected on candidate ports, keeping default', baseURL);
  return baseURL;
}

// Kick off resolution early (non-blocking)
if (!explicitUrl) {
  // Delay resolution slightly to allow backend startup (especially when launched concurrently)
  resolvingPromise = new Promise((resolve) => setTimeout(resolve, 300))
    .then(resolveDynamicBase);
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If request body is FormData, remove the JSON content-type so the
    // browser/axios can set the proper multipart/form-data boundary header.
    try {
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && config.headers['Content-Type']) {
          delete config.headers['Content-Type'];
        }
      }
    } catch (e) {
      // ignore in non-browser environments
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    // If network error and dynamic not resolved yet, attempt resolution then retry
    if (!error.response && !dynamicResolved && resolvingPromise) {
      await resolvingPromise;
      error.config.baseURL = baseURL; // adjust request
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export const getApiBaseURL = () => baseURL;
export const waitForApiBaseURL = () => resolvingPromise || Promise.resolve(baseURL);

export default api;