'use client';

import { useEffect, useRef } from 'react';

export function useRealtime(_tables: string[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    // Периодическое обновление каждые 15 секунд
    const interval = setInterval(() => {
      onChangeRef.current();
    }, 15000);

    // Обновление при возврате на вкладку (когда пользователь переключается)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        onChangeRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);
}