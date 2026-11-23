import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

// Cada tela é um pedaço separado do bundle: o celular do espectador não baixa o editor inteiro.
const App = lazy(() => import('./App'));
const ScreenView = lazy(() => import('./spectator/ScreenView'));
const SpectatorApp = lazy(() => import('./spectator/SpectatorApp'));

/** `/join/CODIGO`: espectador (celular). `/screen/CODIGO`: tela exibida. O resto: o editor. */
function pickApp() {
  if (/^\/join(\/|$)/i.test(location.pathname)) return <SpectatorApp />;
  if (/^\/screen\//i.test(location.pathname)) return <ScreenView />;
  return <App />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <Suspense fallback={null}>{pickApp()}</Suspense>
  </StrictMode>
);
