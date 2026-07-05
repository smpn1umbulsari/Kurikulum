import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SyncManager } from './services/sync/SyncManager';

// Initialize offline connection monitoring
SyncManager.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
