import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Suppress benign WebSocket rejections from the development environment
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('WebSocket closed without opened') || 
      event.reason?.message?.includes('failed to connect to websocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
