'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';
import { ListSkeleton } from '../lib/Skeleton';
import { useRealtime } from '../lib/useRealtime';

const ORANGE = '#FF4A1C';

export default function Requests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
useRealtime(['requests'], load);

  async function load() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    const { data } = await supabase
      .from('requests')
      .select('*, clients(name, phone)')
      .eq('trainer_id', t.id)
      .eq('status', 'новая')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  async function approve(r: any) {
    const t = await getTrainer();
    if (!t) return;
    const { error } = await supabase.from('schedule').insert({
      trainer_id: t.id,
      client_id: r.client_id,
      date: r.date,
      time: r.time,
      status: 'план',
      format: null,
    });
    if (error) { alert(error.message); return; }
    await supabase.from('requests').update({ status: 'принята' }).eq('id', r.id);
    load();
  }

  async function reject(id: string) {
    if (!confirm('Отклонить?')) return;
    await supabase.from('requests').update({ status: 'отклонена' }).eq('id', id);
    load();
  }

if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Заявки</div>
        <div className="text-3xl font-black uppercase tracking-tight mt-1">{requests.length}</div>
      </div>

      <div className="px-5 space-y-3">
        {requests.length === 0 && (
          <div className="rounded-3xl p-8 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
            Нет новых заявок
          </div>
        )}

        {requests.map(r => (
          <div key={r.id} className="rounded-2xl p-4" style={{ background: '#141414', borderLeft: '3px solid ' + ORANGE }}>
            <div className="font-bold">{r.clients?.name}</div>
            {r.clients?.phone && <div className="text-xs mt-1" style={{ color: ORANGE }}>{r.clients.phone}</div>}
            <div className="text-sm text-white/60 mt-2">{r.date} · {r.time}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => approve(r)} className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: ORANGE }}>
                Принять
              </button>
              <button onClick={() => reject(r.id)} className="flex-1 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30">
                Отклонить
              </button>
            </div>
          </div>
        ))}
      </div>

      <TabBar />
    </div>
  );
}