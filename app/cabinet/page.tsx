'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getClientByUser, signOut } from '../lib/auth';

function phaseInfo(day: number) {
  if (day >= 1 && day <= 5) return { color: '#e53935', phase: 'Менструальная', advice: 'Снизить нагрузку.' };
  if (day >= 6 && day <= 13) return { color: '#4caf50', phase: 'Фолликулярная', advice: 'Пик силы.' };
  if (day >= 14 && day <= 16) return { color: '#f9a825', phase: 'Овуляция', advice: 'Пик силы, но связки уязвимы.' };
  if (day >= 17 && day <= 23) return { color: '#4caf50', phase: 'Ранняя лютеиновая', advice: 'Обычный режим.' };
  if (day >= 24) return { color: '#e53935', phase: 'Поздняя лютеиновая', advice: 'Снизить нагрузку.' };
  return { color: '#999', phase: '—', advice: '' };
}

export default function Cabinet() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [cycle, setCycle] = useState<any>(null);
  const [cycleDay, setCycleDay] = useState(0);
  const [phase, setPhase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const c = await getClientByUser();
    if (!c) { router.push('/'); return; }
    setClient(c);

    const { data: s } = await supabase
      .from('schedule')
      .select('*')
      .eq('client_id', c.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');
    setSchedule(s || []);

    const { data: p } = await supabase.from('program_items').select('*').eq('client_id', c.id).order('day');
    setProgram(p || []);

    const { data: cyc } = await supabase
      .from('cycles')
      .select('*')
      .eq('client_id', c.id)
      .order('start_date', { ascending: false });
    const active = (cyc || []).find((x: any) => !x.end_date);
    setCycle(active || null);
    if (active) {
      const start = new Date(active.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let d = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
      if (d < 1) d = 1;
      setCycleDay(d);
      setPhase(phaseInfo(d));
    }

    setLoading(false);
  }

  async function markCycleStart() {
    if (!client) return;
    if (!confirm('Отметить начало цикла сегодня?')) return;
    if (cycle) {
      await supabase.from('cycles').update({ end_date: new Date(Date.now() - 86400000).toISOString().split('T')[0] }).eq('id', cycle.id);
    }
    await supabase.from('cycles').insert({
      client_id: client.id,
      start_date: new Date().toISOString().split('T')[0],
      last_day: 1,
    });
    load();
  }

  async function markCycleDay() {
    if (!client) return;
    const v = prompt('Какой сегодня день цикла?', '');
    if (!v) return;
    const n = parseInt(v);
    if (!n || n < 1 || n > 60) { alert('Введи от 1 до 60'); return; }
    if (cycle) {
      await supabase.from('cycles').update({ end_date: new Date(Date.now() - 86400000).toISOString().split('T')[0] }).eq('id', cycle.id);
    }
    const start = new Date();
    start.setDate(start.getDate() - (n - 1));
    await supabase.from('cycles').insert({
      client_id: client.id,
      start_date: start.toISOString().split('T')[0],
      last_day: n,
    });
    load();
  }

  async function markCycleMiss() {
    if (!cycle) { alert('Нет активного цикла'); return; }
    if (!confirm('Отметить сбой цикла?')) return;
    await supabase.from('cycles').update({ end_date: new Date().toISOString().split('T')[0] }).eq('id', cycle.id);
    load();
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
          <button onClick={handleSignOut} className="bg-white/20 px-4 py-2 rounded-full text-sm">Выйти</button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm text-center">
          <div className="text-sm text-gray-500 mb-2">Остаток занятий</div>
          <div className="text-5xl font-bold text-purple-700">{client.rest}</div>
        </div>

        {client.gender === 'female' && (
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <div className="text-lg font-bold mb-3">Мой цикл</div>
            {cycle && phase ? (
              <>
                <div className="rounded-xl p-4 text-white text-center mb-3" style={{ background: phase.color }}>
                  <div className="text-3xl font-bold">День {cycleDay}</div>
                  <div className="text-sm mt-1">{phase.phase}</div>
                </div>
                <div className="text-sm rounded-lg p-3 mb-3" style={{ background: phase.color + '22', color: phase.color }}>
                  {phase.advice}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4 mb-3">Цикл не отмечен</div>
            )}
            <button onClick={markCycleStart} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold mb-2">
              Начало цикла (сегодня 1-й день)
            </button>
            <button onClick={markCycleDay} className="w-full py-3 bg-purple-100 text-purple-700 rounded-xl font-bold mb-2">
              Ввести день цикла
            </button>
            {cycle && (
              <button onClick={markCycleMiss} className="w-full py-3 bg-gray-100 text-red-600 rounded-xl font-bold">
                Сбой цикла
              </button>
            )}
          </div>
        )}

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