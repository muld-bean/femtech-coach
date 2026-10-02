'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getClientByUser, signOut } from '../lib/auth';

export default function Cabinet() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const c = await getClientByUser();
    if (!c) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      router.push('/');
      return;
    }
    setClient(c);

    const { data: s } = await supabase
      .from('schedule')
      .select('*')
      .eq('client_id', c.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');
    setSchedule(s || []);

    const { data: p } = await supabase
      .from('program_items')
      .select('*')
      .eq('client_id', c.id)
      .order('day');
    setProgram(p || []);

    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  if (!client) return <div className="min-h-screen flex items-center justify-center">Нет доступа</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm opacity-80">Мой кабинет</div>
            <div className="text-2xl font-bold">{client.name}</div>
          </div>
          <button onClick={handleSignOut} className="bg-white/20 px-4 py-2 rounded-full text-sm">
            Выйти
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm text-center">
          <div className="text-sm text-gray-500 mb-2">Остаток занятий</div>
          <div className="text-5xl font-bold text-purple-700">{client.rest}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-lg font-bold mb-3">Мои тренировки</div>
          {schedule.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">Нет предстоящих</div>
          ) : (
            schedule.map(s => (
              <div key={s.id} className="flex justify-between py-2 border-b border-gray-100">
                <div>
                  <div className="font-semibold">{s.date} · {s.time}</div>
                  <div className="text-xs text-gray-500">{s.format || ''}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full self-center bg-gray-100 text-gray-600">{s.status}</div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-lg font-bold mb-3">Программа</div>
          {program.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">Программа не назначена</div>
          ) : (
            [1,2,3,4,5].map(day => {
              const dayItems = program.filter(p => p.day === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="mb-3">
                  <div className="text-xs font-bold text-purple-700 mb-1">День {day}</div>
                  {dayItems.map(p => (
                    <div key={p.id} className="py-2 border-b border-gray-100">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.sets || '?'} × {p.reps || '?'} {p.weight || ''}</div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}