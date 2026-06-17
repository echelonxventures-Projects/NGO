'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (offline shell + push). Rendered once in the root layout.
 * Silent no-op where service workers are unavailable (older browsers, SSR).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
