import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { buildModel } from '@/engine';
import { useProjectStore } from '@/store';
import { getLang } from '@/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Dev-only hook for inspecting the calculation engine from the browser console.
if (import.meta.env.DEV) {
  Object.assign(window, { __timber: { buildModel, store: useProjectStore } });
}

document.documentElement.lang = getLang();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
