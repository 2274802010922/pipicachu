"use client";
import { useCallback, useEffect, useState } from "react";
/** A render-visible age gate; refresh failures immediately invalidate writes. */
export function useFreshness() {
  const [checkedAt, setCheckedAt] = useState(0),
    [now, setNow] = useState(0);
  const markFresh = useCallback(() => {
    const at = performance.now();
    setCheckedAt(at);
    setNow(at);
  }, []);
  const markStale = useCallback(() => setCheckedAt(0), []);
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return {
    fresh: checkedAt > 0 && now - checkedAt < 20000,
    markFresh,
    markStale,
  };
}
