import { useEffect, useState } from 'react';
import { getSupportsKeyboardShortcuts } from '../utils/deviceCapability';

const CAPABILITY_MEDIA_QUERIES = [
  '(hover: hover)',
  '(pointer: fine)',
  '(pointer: coarse)',
  '(any-hover: hover)',
  '(any-pointer: fine)',
];

/**
 * Reactive hook returning true only on devices whose pointer/hover capabilities
 * indicate a desktop/laptop (or hybrid with attached fine pointer).
 * Returns false on touch-only mobile phones and tablets regardless of screen width.
 */
export function useSupportsKeyboardShortcuts(): boolean {
  const [supported, setSupported] = useState<boolean>(() => getSupportsKeyboardShortcuts());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const update = () => {
      setSupported(getSupportsKeyboardShortcuts());
    };

    update();

    const lists = CAPABILITY_MEDIA_QUERIES.map((q) => window.matchMedia(q));
    for (const mq of lists) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', update);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(update);
      }
    }
    window.addEventListener('resize', update);

    return () => {
      for (const mq of lists) {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', update);
        } else if (typeof mq.removeListener === 'function') {
          mq.removeListener(update);
        }
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return supported;
}
