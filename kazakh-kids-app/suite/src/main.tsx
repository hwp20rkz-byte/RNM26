import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Router } from './app/router';
import { installAudioUnlock } from './store/useAudioStore';

installAudioUnlock();
// Android back button (MainActivity calls window.qBack): game → hub → main game
(window as unknown as { qBack?: () => boolean }).qBack = () => {
  if (window.location.hash && window.location.hash !== '#/') { window.location.hash = '/'; return true; }
  window.location.href = '../index.html'; return true;
};
createRoot(document.getElementById('root')!).render(<StrictMode><Router /></StrictMode>);
