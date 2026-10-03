'use client';

import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function useRealtime(tables: string[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const channelName = 'realtime_' + tables.join('_') + '_' + Date.now();
    const channel = supabase.channel(channelName);

    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log('🔔 REALTIME', table, payload);
          onChangeRef.current();
        }
      );
    });

    channel.subscribe((status) => {
      console.log('📡 Realtime status:', status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')]);
}