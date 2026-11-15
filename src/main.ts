import './index.css';
import Alpine from 'alpinejs';
import { createRotorClashApp } from './app/rotorClashStore';
import { renderAppShell } from './templates/sections';

const rootEl = document.getElementById('app');
if (rootEl) {
  rootEl.innerHTML = renderAppShell();
}

Alpine.data('rotorClashApp', createRotorClashApp);
(window as unknown as { Alpine: typeof Alpine }).Alpine = Alpine;
Alpine.start();
