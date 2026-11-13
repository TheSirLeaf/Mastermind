import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import ScreenView from './spectator/ScreenView';
import SpectatorApp from './spectator/SpectatorApp';

/** `/join/CODIGO`: espectador (celular). `/screen/CODIGO`: tela exibida. O resto: o editor. */
function pickApp() {
  if (/^\/join(\/|$)/i.test(location.pathname)) return <SpectatorApp />;
  if (/^\/screen\//i.test(location.pathname)) return <ScreenView />;
  return <App />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(<StrictMode>{pickApp()}</StrictMode>);
