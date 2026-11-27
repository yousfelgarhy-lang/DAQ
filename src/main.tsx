import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

interface WindowWithPWAPrompt extends Window {
  __daqDeferredInstallPrompt?: Event | null;
  __daqAppInstalled?: boolean;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  (window as WindowWithPWAPrompt).__daqAppInstalled = true;
  (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = null;
});

registerSW({
  immediate: true,
});

createRoot(document.getElementById('root')!).render(<App />);
