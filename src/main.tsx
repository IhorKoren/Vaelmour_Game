import React from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './app/AppShell';
import { AdminPanel } from './admin/AdminPanel';
import { TonProvider } from './features/ton/TonConnectProvider';
import "./styles/global.css";

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const isAdminRoute = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <TonProvider>
      {isAdminRoute ? <AdminPanel /> : <AppShell />}
    </TonProvider>
  </React.StrictMode>,
);
