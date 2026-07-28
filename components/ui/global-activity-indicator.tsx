"use client";

import { useEffect, useRef, useState } from "react";

export function GlobalActivityIndicator({
  navigating,
}: {
  navigating: boolean;
}) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSinceRef = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch;
    const trackedFetch: typeof window.fetch = async (...arguments_) => {
      setPendingRequests((current) => current + 1);
      try {
        return await originalFetch(...arguments_);
      } finally {
        setPendingRequests((current) => Math.max(0, current - 1));
      }
    };

    window.fetch = trackedFetch;
    return () => {
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const active = navigating || pendingRequests > 0;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (active) {
      if (visible || showTimerRef.current) return;
      showTimerRef.current = setTimeout(
        () => {
          visibleSinceRef.current = Date.now();
          setVisible(true);
          showTimerRef.current = null;
        },
        navigating ? 80 : 300,
      );
      return;
    }

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (!visible) return;

    const remaining = Math.max(
      0,
      500 - (Date.now() - visibleSinceRef.current),
    );
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, remaining);
  }, [navigating, pendingRequests, visible]);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  if (!visible) return null;

  return (
    <>
      <div
        className="activity-progress fixed inset-x-0 top-0 z-[80] h-1.5 overflow-hidden bg-blue-100"
        aria-hidden="true"
      >
        <div className="activity-progress-bar h-full" />
      </div>
      <div
        className="activity-toast fixed right-4 bottom-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-blue-950 shadow-xl backdrop-blur"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="activity-orb" aria-hidden="true">
          <span />
        </span>
        <span>
          <span className="block text-sm font-bold">
            {navigating ? "Preparando pantalla" : "Procesando información"}
          </span>
          <span className="block text-xs text-blue-700">
            Puedes esperar; la operación continúa en segundo plano.
          </span>
        </span>
      </div>
    </>
  );
}
