import { useEffect, useRef, useState } from 'react';

type PollingResult<T> = {
  data: T | null;
  error: string | null;
  start: (url: string) => void
  stop: () => void,
  refresh: () => void
};

export function usePollingWorker<T>(interval: number): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../utils/pollingWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'data') {
        setData(payload);
        setError(null);
      } else if (type === 'error') {
        setError(payload);
      }
    };

    workerRef.current.postMessage({ action: 'init', interval });

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({action: 'stop'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [interval]);

  function start(url: string) {
    workerRef.current?.postMessage({action: 'start',  url})
  }

  function stop() {
    workerRef.current?.postMessage({action: 'stop'})
  }

  function refresh() {
    workerRef.current?.postMessage({action: 'refresh'})
  }

  return { data, error, start, stop, refresh };
}
