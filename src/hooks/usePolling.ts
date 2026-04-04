import { useEffect, useRef } from "react";

type Callback = () => Promise<void> | void;

export function usePolling(callback: Callback, enabled: boolean, intervalMs = 3000) {
  const callbackRef = useRef<Callback>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        await callbackRef.current();
      } catch (err) {
        console.error("usePolling error:", err);
      }
    };

    // run immediately then on interval
    tick();
    id = setInterval(tick, intervalMs);

    return () => {
      if (id) clearInterval(id);
    };
  }, [enabled, intervalMs]);
}

export default usePolling;
