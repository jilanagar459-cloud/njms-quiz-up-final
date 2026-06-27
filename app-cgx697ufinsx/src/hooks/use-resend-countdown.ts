import { useState, useEffect, useRef } from 'react';

/**
 * Returns seconds remaining and a restart function.
 * Starts immediately with `initialSeconds`.
 */
export function useResendCountdown(initialSeconds = 60) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = (s = initialSeconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(s);
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => { start(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { seconds, restart: start };
}
