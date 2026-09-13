import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { buildModel } from '@/engine';
import { useProjectStore } from '@/store';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Dev-only hook for inspecting the calculation engine from the browser console.
if (import.meta.env.DEV) {
  Object.assign(window, { __timber: { buildModel, store: useProjectStore } });
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
