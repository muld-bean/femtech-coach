'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

export default function Requests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

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
    const { error: e1 } = await supabase.from('schedule').insert({
      trainer_id: t.id,
      client_id: r.client_id,
      date: r.date,
      time: r.time,
      status: 'план',
      format: null,
    });
    if (e1) { alert(e1.message); return; }
    await supabase.from('requests').update({ status: 'принята' }).eq('id', r.id);
    load();
  }

  async function reject(id: string) {
    if (!confirm('Отклонить заявку?')) return;
    await supabase.from('requests').update({ status: 'отклонена' }).eq('id', id);
    load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="text-2xl font-bold">Заявки</div>
        <div className="text-sm opacity-80 mt-1">Новых: {requests.length}</div>
      </div>

      <div className="p-4">
        {requests.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            Нет новых заявок
          </div>
        )}

        {requests.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border-l-4 border-yellow-400">
            <div className="font-bold text-gray-800">{r.clients?.name}</div>
            {r.clients?.phone && <div className="text-sm text-purple-600 mt-1">{r.clients.phone}</div>}
            <div className="text-sm text-gray-600 mt-2">
              {r.date} · {r.time}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => approve(r)} className="flex-1 py-2 bg-green-600 text-white rounded-xl font-bold text-sm">
                Принять
              </button>
              <button onClick={() => reject(r.id)} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-sm">
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