'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

export default function Schedule() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [showAdd, setShowAdd] = useState(false);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('10:00');
  const [selClient, setSelClient] = useState('');
  const [loading, setLoading] = useState(true);

  function getMonday(d: Date) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function fmt(d: Date) {
    const p = (n: number) => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  useEffect(() => { loadData(); }, [weekStart]);

  async function loadData() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    setTrainer(t);
    const { data: c } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(c || []);

    const end = new Date(weekStart); end.setDate(end.getDate() + 7);
    const { data: s } = await supabase
      .from('schedule')
      .select('*, clients(name, format)')
      .eq('trainer_id', t.id)
      .gte('date', fmt(weekStart))
      .lt('date', fmt(end))
      .order('date').order('time');
    setItems(s || []);
    setLoading(false);
  }

  function openAdd(dateKey: string) {
    setSelDate(dateKey);
    setSelTime('10:00');
    setSelClient(clients[0]?.id || '');
    setShowAdd(true);
  }

  async function addItem() {
    if (!selClient || !trainer) return;
    const client = clients.find(c => c.id === selClient);
    const { error } = await supabase.from('schedule').insert({
      trainer_id: trainer.id,
      client_id: selClient,
      date: selDate,
      time: selTime,
      status: 'план',
      format: client?.format || null,
    });
    if (error) { alert(error.message); return; }
    setShowAdd(false);
    loadData();
  }

  async function removeItem(id: string) {
    if (!confirm('Удалить запись?')) return;
    await supabase.from('schedule').delete().eq('id', id);
    loadData();
  }

  async function markDone(id: string, clientId: string) {
    await supabase.from('schedule').update({ status: 'проведено' }).eq('id', id);
    const client = clients.find(c => c.id === clientId);
    if (client && client.rest > 0) {
      await supabase.from('clients').update({ rest: client.rest - 1 }).eq('id', clientId);
    }
    loadData();
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const DNS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-5 rounded-b-3xl">
        <div className="text-xl font-bold">Расписание</div>
        <div className="flex justify-between items-center mt-4">
          <button onClick={prevWeek} className="bg-white/20 px-4 py-2 rounded-xl">Назад</button>
          <div className="font-semibold text-sm">{fmt(weekStart)} — {fmt(days[6])}</div>
          <button onClick={nextWeek} className="bg-white/20 px-4 py-2 rounded-xl">Вперёд</button>
        </div>
      </div>

      <div className="p-4">
        {days.map(d => {
          const key = fmt(d);
          const dayItems = items.filter(i => i.date === key).sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={key} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-gray-800">{DNS[d.getDay()]} {key.slice(8, 10)}.{key.slice(5, 7)}</div>
                <button onClick={() => openAdd(key)} className="text-purple-700 text-sm font-bold">+ записать</button>
              </div>
              {dayItems.length === 0 && <div className="text-gray-400 text-sm py-2">пусто</div>}
              {dayItems.map(it => (
                <div key={it.id} className={'flex justify-between items-center py-2 border-t border-gray-100 ' + (it.status === 'проведено' ? 'opacity-50' : '')}>
                  <div>
                    <div className="font-semibold text-gray-800">{it.time} · {it.clients?.name}</div>
                    <div className="text-xs text-gray-500">{it.clients?.format || ''}</div>
                  </div>
                  <div className="flex gap-2">
                    {it.status !== 'проведено' && (
                      <button onClick={() => markDone(it.id, it.client_id)} className="text-green-600 text-xs font-bold px-2">Проведено</button>
                    )}
                    <button onClick={() => removeItem(it.id)} className="text-red-500 text-xs font-bold px-2">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новая запись</h3>
            <div className="text-sm text-gray-500 mb-3">{selDate}</div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Клиент</label>
            <select value={selClient} onChange={e => setSelClient(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3">
              <option value="">Выбери клиента</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Время</label>
            <input type="time" value={selTime} onChange={e => setSelTime(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addItem} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}