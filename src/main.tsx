import React from "react"; // ScrollUniversity v2.1
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { PerformanceOptimizer } from "./components/performance/PerformanceOptimizer";
import { performanceMonitor } from "./lib/performance-monitor";
import { isPreviewPWAContext } from "./lib/pwa-utils";
import "./index.css";

// Auto-recover from stale dynamic-import chunks (e.g. after a redeploy on mobile Safari)
const CHUNK_RELOAD_KEY = '__su_chunk_reload_at';
const isChunkLoadError = (reason: unknown): boolean => {
  const msg = String((reason as any)?.message || reason || '');
  return (
    (reason as any)?.name === 'ChunkLoadError' ||
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg)
  );
};
const maybeReloadForChunk = (reason: unknown) => {
  if (!isChunkLoadError(reason)) return;
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
};
window.addEventListener('unhandledrejection', (e) => maybeReloadForChunk(e.reason));
window.addEventListener('error', (e) => maybeReloadForChunk(e.error));

// Mark app initialization start
performanceMonitor.mark('app-init-start');

const PREVIEW_CACHE_RESET_KEY = '__lovable_preview_cache_reset__';

// Always purge any previously registered service worker + caches unless the app
// is genuinely running as an installed standalone PWA. A stale SW is the most
// common cause of a blank/frozen preview iframe.
void (async () => {
  const isStandalonePWA =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  if (isStandalonePWA && !isPreviewPWAContext()) {
    sessionStorage.removeItem(PREVIEW_CACHE_RESET_KEY);
    return;
  }

  const registrations = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistrations()
    : [];

  await Promise.all(registrations.map((registration) => registration.unregister()));

  const cacheNames = 'caches' in window ? await caches.keys() : [];
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

  const hadStalePwaState = registrations.length > 0 || cacheNames.length > 0;
  const hasReloadedAfterCleanup = sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY) === '1';

  if (hadStalePwaState && !hasReloadedAfterCleanup) {
    sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, '1');
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(PREVIEW_CACHE_RESET_KEY);
})();


createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <PerformanceOptimizer>
      <App />
    </PerformanceOptimizer>
  </ErrorBoundary>
);

// Mark app initialization complete
performanceMonitor.mark('app-init-complete');
performanceMonitor.measure('app-init-duration', 'app-init-start', 'app-init-complete');
