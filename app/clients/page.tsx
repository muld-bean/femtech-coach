'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';
import { ListSkeleton } from '../lib/Skeleton';

const ORANGE = '#FF4A1C';

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    const { data } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(data || []);
    setLoading(false);
  }

if (loading) return <ListSkeleton rows={8} />;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Клиенты</div>
        <div className="text-3xl font-black uppercase tracking-tight mt-1">{clients.length}</div>
      </div>

      <div className="px-5 space-y-3">
        {clients.length === 0 && (
          <div className="rounded-3xl p-8 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
            Нет клиентов
          </div>
        )}

        {clients.map(c => (
          <div
            key={c.id}
            onClick={() => router.push('/client/' + c.id)}
            className="rounded-2xl p-4 cursor-pointer"
            style={{ background: '#141414', border: '1px solid #262626' }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-white/50 mt-1">{c.format || 'без формата'}</div>
                {c.phone && <div className="text-xs mt-1" style={{ color: ORANGE }}>{c.phone}</div>}
              </div>
              {c.rest > 0 && (
                <div className="text-xs px-2 py-1 rounded-full" style={{ background: ORANGE + '22', color: ORANGE }}>
                  {c.rest} зан.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <TabBar />
    </div>
  );
}