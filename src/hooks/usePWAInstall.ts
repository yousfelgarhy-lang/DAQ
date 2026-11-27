import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAInstallStatus =
  | 'available'
  | 'installing'
  | 'installed'
  | 'already-installed'
  | 'unavailable';

interface WindowWithPWAPrompt extends Window {
  __daqDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  __daqAppInstalled?: boolean;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

function detectIOSSafari(): boolean {
  if (!detectIOSDevice()) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  // Safari on iOS includes Safari/ but not CriOS (Chrome), FxiOS (Firefox), EdgiOS (Edge)
  return /safari/.test(ua) && !/crios|fxios|edgios|opios/.test(ua);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    return (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt ?? null;
  });

  const [status, setStatus] = useState<PWAInstallStatus>(() => {
    if (typeof window === 'undefined') return 'unavailable';
    if (isStandaloneMode()) return 'already-installed';
    if ((window as WindowWithPWAPrompt).__daqAppInstalled) return 'installed';
    if ((window as WindowWithPWAPrompt).__daqDeferredInstallPrompt) return 'available';
    return 'unavailable';
  });

  const [isIOS, setIsIOS] = useState<boolean>(() => detectIOSDevice());
  const [isIOSSafari, setIsIOSSafari] = useState<boolean>(() => detectIOSSafari());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    const syncFromEnvironment = () => {
      setIsIOS(detectIOSDevice());
      setIsIOSSafari(detectIOSSafari());

      if (isStandaloneMode()) {
        setStatus('already-installed');
        return;
      }
      if ((window as WindowWithPWAPrompt).__daqAppInstalled) {
        setStatus('installed');
        return;
      }
      const earlyPrompt = (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt;
      if (earlyPrompt) {
        setDeferredPrompt(earlyPrompt);
        setStatus('available');
      }
    };

    syncFromEnvironment();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setStatus((prev) =>
        prev === 'installed' || prev === 'already-installed' ? prev : 'available'
      );
    };

    const handleAppInstalled = () => {
      (window as WindowWithPWAPrompt).__daqAppInstalled = true;
      (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setStatus('installed');
    };

    const handleDisplayModeChange = () => {
      if (isStandaloneMode()) {
        setStatus('already-installed');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    setStatus('installing');
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = null;
      setDeferredPrompt(null);

      if (outcome === 'accepted') {
        (window as WindowWithPWAPrompt).__daqAppInstalled = true;
        setStatus('installed');
        return 'accepted';
      }
      setStatus('unavailable');
      return 'dismissed';
    } catch {
      (window as WindowWithPWAPrompt).__daqDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setStatus('unavailable');
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    status,
    isInstallable: status === 'available',
    isInstalling: status === 'installing',
    isInstalled: status === 'installed' || status === 'already-installed',
    isAlreadyInstalled: status === 'already-installed',
    isIOS,
    isIOSSafari,
    install,
  };
}
