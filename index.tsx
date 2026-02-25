
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './contexts/UserContext';
import { I18nProvider } from './services/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </I18nProvider>
  </React.StrictMode>
);

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registrado com sucesso: ', registration.scope);
      })
      .catch((err) => {
        console.log('Falha ao registrar ServiceWorker: ', err);
      });
  });
}
