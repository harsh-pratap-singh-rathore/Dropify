// Dropify API Base Configuration
// In local development, requests use relative paths ('') proxied through Vite.
// In desktop Electron environment, requests route to local high-fidelity backend server.
// In production web, requests connect directly to the persistent Render backend.

let dynamicBase = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? ''
  : 'https://dropify-backend-wy9v.onrender.com';

if (typeof window !== 'undefined' && window.electronAPI) {
  if (window.electronAPI.serverUrl) {
    dynamicBase = window.electronAPI.serverUrl;
  }
  if (typeof window.electronAPI.getServerUrl === 'function') {
    window.electronAPI.getServerUrl().then((url) => {
      if (url) {
        dynamicBase = url.replace(/\/+$/, '');
      }
    }).catch(() => {});
  }
}

export const API_BASE = dynamicBase;

export function getApiBase() {
  return dynamicBase;
}

export function apiUrl(endpoint) {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${dynamicBase}${cleanEndpoint}`;
}
