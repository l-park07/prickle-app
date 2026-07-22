import { useEffect, useRef } from 'react';

/**
 * Trailing-edge debounce: rapid calls collapse into one, delayMs after the
 * last one. For write paths where several quick toggles (e.g. flipping four
 * legend rows) shouldn't produce a round trip each.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const debouncedRef = useRef((...args: Args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  });

  return debouncedRef.current;
}
