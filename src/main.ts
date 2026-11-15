import { mount } from 'svelte';
import './styles/app.css';
import App from './app/App.svelte';
import { boot } from './app/state.svelte';

mount(App, { target: document.getElementById('app')! });
void boot();

// Offline support: cache the game after the first visit.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
