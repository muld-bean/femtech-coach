'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="text-2xl font-bold">Клиенты</div>
        <div className="text-sm opacity-80 mt-1">Всего: {clients.length}</div>
      </div>

      <div className="p-4">
        {clients.map(c => (
          <div key={c.id} onClick={() => router.push('/client/' + c.id)} className="bg-white rounded-2xl p-4 mb-3 shadow-sm cursor-pointer">
            <div className="font-bold text-gray-800">{c.name}</div>
            <div className="text-sm text-gray-500">{c.format || 'без формата'}</div>
            {c.phone && <div className="text-sm text-purple-600 mt-1">{c.phone}</div>}
            {c.rest > 0 && <div className="text-sm text-green-700 mt-1 font-semibold">Остаток: {c.rest}</div>}
          </div>
        ))}
      </div>
      <TabBar />
    </div>
  );
}