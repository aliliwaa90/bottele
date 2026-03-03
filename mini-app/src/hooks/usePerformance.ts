/**
 * Performance Optimization Hook
 * - Debounce expensive operations
 * - Throttle animations
 * - Optimize re-renders
 */
import { useCallback, useRef, useEffect } from "react";

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<number | null>(null);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay],
  );
}

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    }) as T,
    [callback, delay],
  );
}

export function useRequestIdleCallback(callback: () => void, options?: IdleRequestOptions) {
  useEffect(() => {
    if (typeof (window as any).requestIdleCallback !== "undefined") {
      const id = (window as any).requestIdleCallback(callback, options);
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, 1);
      return () => clearTimeout(id);
    }
  }, [callback, options]);
}
