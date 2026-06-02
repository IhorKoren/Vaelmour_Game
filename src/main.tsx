import React from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './app/AppShell';
import { AdminPanel } from './admin/AdminPanel';
import "./styles/global.css";

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const isAdminRoute = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>{isAdminRoute ? <AdminPanel /> : <AppShell />}</React.StrictMode>,
);
