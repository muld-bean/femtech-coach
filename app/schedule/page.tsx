'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

const ORANGE = '#FF4A1C';

export default function Schedule() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('10:00');
  const [selClient, setSelClient] = useState('');
  const [showShift, setShowShift] = useState(false);
  const [shDate, setShDate] = useState('');
  const [shStart, setShStart] = useState('09:00');
  const [shEnd, setShEnd] = useState('13:00');

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

    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    const { data: s } = await supabase
      .from('schedule')
      .select('*, clients(name, format)')
      .eq('trainer_id', t.id)
      .gte('date', fmt(weekStart))
      .lt('date', fmt(end))
      .order('date').order('time');
    setItems(s || []);

    const { data: sh } = await supabase
      .from('shifts')
      .select('*')
      .eq('trainer_id', t.id)
      .gte('date', fmt(weekStart))
      .lt('date', fmt(end))
      .order('date').order('start_time');
    setShifts(sh || []);

    setLoading(false);
  }

  function openAdd(dateKey: string) {
    setSelDate(dateKey);
    setSelTime('10:00');
    setSelClient(clients[0]?.id || '');
    setShowAdd(true);
  }

  function openShift(dateKey: string) {
    setShDate(dateKey);
    setShStart('09:00');
    setShEnd('13:00');
    setShowShift(true);
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

  async function addShift() {
    if (!trainer) return;
    const { error } = await supabase.from('shifts').insert({
      trainer_id: trainer.id,
      date: shDate,
      start_time: shStart,
      end_time: shEnd,
    });
    if (error) { alert(error.message); return; }
    setShowShift(false);
    loadData();
  }

  async function removeItem(id: string) {
    if (!confirm('Удалить?')) return;
    await supabase.from('schedule').delete().eq('id', id);
    loadData();
  }

  async function removeShift(id: string) {
    if (!confirm('Удалить смену?')) return;
    await supabase.from('shifts').delete().eq('id', id);
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Расписание</div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={prevWeek} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>←</button>
          <div className="text-sm font-bold">{fmt(weekStart)} — {fmt(days[6])}</div>
          <button onClick={nextWeek} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>→</button>
        </div>
      </div>

      <div className="px-5 space-y-3">
        {days.map(d => {
          const key = fmt(d);
          const dayItems = items.filter(i => i.date === key).sort((a, b) => a.time.localeCompare(b.time));
          const dayShifts = shifts.filter(s => s.date === key);
          const isToday = key === fmt(new Date());

          return (
            <div key={key} className="rounded-3xl p-4" style={{ background: isToday ? '#1a1a1a' : '#141414', border: '1px solid ' + (isToday ? ORANGE + '55' : '#262626') }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-black uppercase">{DNS[d.getDay()]} {key.slice(8, 10)}.{key.slice(5, 7)}</div>
                  {isToday && <div className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openShift(key)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ color: '#60a5fa', background: '#1e3a5f22' }}>+ смена</button>
                  <button onClick={() => openAdd(key)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg" style={{ color: ORANGE, background: ORANGE + '22' }}>+ запись</button>
                </div>
              </div>

              {dayShifts.length > 0 && (
                <div className="rounded-2xl p-2 mb-2" style={{ background: '#1e3a5f22' }}>
                  {dayShifts.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-xs py-1">
                      <span style={{ color: '#60a5fa' }}>Смена {s.start_time}–{s.end_time}</span>
                      <button onClick={() => removeShift(s.id)} className="text-red-400 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}

              {dayItems.length === 0 && dayShifts.length === 0 && (
                <div className="text-white/30 text-xs py-2">пусто</div>
              )}

              {dayItems.map(it => (
                <div key={it.id} className="flex justify-between items-center py-2 border-t border-neutral-900 first:border-0" style={{ opacity: it.status === 'проведено' ? 0.4 : 1 }}>
                  <div>
                    <div className="font-bold text-sm">{it.time} · {it.clients?.name}</div>
                    <div className="text-xs text-white/50 mt-1">{it.clients?.format || ''}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {it.status !== 'проведено' && (
                      <button onClick={() => markDone(it.id, it.client_id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: '#4ade80', background: '#4ade8022' }}>✓</button>
                    )}
                    <button onClick={() => removeItem(it.id)} className="text-red-400 text-xs font-bold px-2">×</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-2">Новая запись</div>
            <div className="text-xs text-white/40 mb-4">{selDate}</div>
            <select value={selClient} onChange={e => setSelClient(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }}>
              <option value="">Выбери клиента</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="time" value={selTime} onChange={e => setSelTime(e.target.value)} className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addItem} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showShift && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowShift(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-2">Новая смена</div>
            <div className="text-xs text-white/40 mb-4">{shDate}</div>
            <div className="flex gap-2 mb-4">
              <input type="time" value={shStart} onChange={e => setShStart(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
              <input type="time" value={shEnd} onChange={e => setShEnd(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowShift(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addShift} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#3b82f6' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}