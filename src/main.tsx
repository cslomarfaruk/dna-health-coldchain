import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerNotificationServiceWorker } from './services/notificationClient';

// Register background service worker for mobile and desktop push notifications
registerNotificationServiceWorker().catch(() => {});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
