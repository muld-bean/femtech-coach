'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';
import { ScheduleSkeleton } from '../lib/Skeleton';
import { useRealtime } from '../lib/useRealtime';

const ORANGE = '#FF4A1C';

const DNS_FULL = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function shortDate(iso: string) {
  if (!iso) return '';
  const p = iso.split('-');
  return p[2] + '.' + p[1];
}

export default function Schedule() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(true);

  // одна запись
  const [showAdd, setShowAdd] = useState(false);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('10:00');
  const [selClient, setSelClient] = useState('');

  // одна смена
  const [showShift, setShowShift] = useState(false);
  const [shDate, setShDate] = useState('');
  const [shStart, setShStart] = useState('09:00');
  const [shEnd, setShEnd] = useState('13:00');

  // массово
  const [showBulk, setShowBulk] = useState(false);
const [bulkDays, setBulkDays] = useState<number[]>([1, 3, 5]);
const [bulkStart, setBulkStart] = useState('19:00');
const [bulkFrom, setBulkFrom] = useState('');
const [bulkTo, setBulkTo] = useState('');
const [bulkClient, setBulkClient] = useState('');
const [bulkBusy, setBulkBusy] = useState(false);

const [showBulkDel, setShowBulkDel] = useState(false);
const [delDays, setDelDays] = useState<number[]>([]);
const [delFrom, setDelFrom] = useState('');
const [delTo, setDelTo] = useState('');
const [delClient, setDelClient] = useState('');
const [delBusy, setDelBusy] = useState(false);
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
useRealtime(['schedule', 'shifts'], loadData);

  async function loadData() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    setTrainer(t);

    const { data: c } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(c || []);

    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    const { data: s } = await supabase.from('schedule')
      .select('*, clients(name, format)')
      .eq('trainer_id', t.id)
      .gte('date', fmt(weekStart))
      .lt('date', fmt(end))
      .order('date').order('time');
    setItems(s || []);

    const { data: sh } = await supabase.from('shifts')
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
    setShowAdd(false); loadData();
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
    setShowShift(false); loadData();
  }

  function openBulk() {
  const today = new Date();
  setBulkFrom(fmt(today));
  const inMonth = new Date();
  inMonth.setDate(inMonth.getDate() + 28);
  setBulkTo(fmt(inMonth));
  setBulkDays([1, 3, 5]);
  setBulkStart('10:00');
  setBulkClient(clients[0]?.id || '');
  setShowBulk(true);
}

function toggleBulkDay(d: number) {
  if (bulkDays.includes(d)) setBulkDays(bulkDays.filter(x => x !== d));
  else setBulkDays([...bulkDays, d]);
}

async function runBulk() {
  if (!trainer || bulkDays.length === 0 || !bulkFrom || !bulkTo) {
    alert('Заполни дни и период');
    return;
  }
  if (!bulkClient) {
    alert('Выбери клиента');
    return;
  }
  setBulkBusy(true);

  const from = new Date(bulkFrom);
  const to = new Date(bulkTo);
  const created: any[] = [];
  const client = clients.find(c => c.id === bulkClient);

  const cur = new Date(from);
  while (cur <= to) {
    if (bulkDays.includes(cur.getDay())) {
      created.push({
        trainer_id: trainer.id,
        client_id: bulkClient,
        date: fmt(cur),
        time: bulkStart,
        status: 'план',
        format: client?.format || null,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (created.length === 0) {
    alert('Ничего не создалось');
    setBulkBusy(false);
    return;
  }

  const { error } = await supabase.from('schedule').insert(created);
  setBulkBusy(false);
  if (error) { alert(error.message); return; }
  alert('Создано записей: ' + created.length);
  setShowBulk(false);
  loadData();
}

function openBulkDelete() {
  const today = new Date();
  setDelFrom(fmt(today));
  const inMonth = new Date();
  inMonth.setDate(inMonth.getDate() + 28);
  setDelTo(fmt(inMonth));
  setDelDays([]);
  setDelClient(clients[0]?.id || '');
  setShowBulkDel(true);
}

function toggleDelDay(d: number) {
  if (delDays.includes(d)) setDelDays(delDays.filter(x => x !== d));
  else setDelDays([...delDays, d]);
}

async function runBulkDelete() {
  if (!delFrom || !delTo || !delClient) {
    alert('Заполни клиента и период');
    return;
  }
  if (!confirm('Удалить все записи этого клиента за период?')) return;
  setDelBusy(true);

  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('client_id', delClient)
    .gte('date', delFrom)
    .lte('date', delTo);

  if (error) { alert(error.message); setDelBusy(false); return; }
  setDelBusy(false);
  alert('Записи удалены');
  setShowBulkDel(false);
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

if (loading) return <ScheduleSkeleton />;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Расписание</div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={prevWeek} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>←</button>
          <div className="text-sm font-bold">{shortDate(fmt(weekStart))} — {shortDate(fmt(days[6]))}</div>
          <button onClick={nextWeek} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>→</button>
        </div>
       <div className="flex gap-2 mt-3">
  <button onClick={() => openBulk()} className="flex-1 text-xs font-bold py-2 rounded-xl" style={{ background: ORANGE + '22', color: ORANGE }}>
    Записать массово
  </button>
  <button onClick={() => openBulkDelete()} className="flex-1 text-xs font-bold py-2 rounded-xl" style={{ background: '#ef444422', color: '#ef4444' }}>
    Удалить массово
  </button>
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
                  <div className="text-sm font-black uppercase">{DNS_FULL[d.getDay()]} {shortDate(key)}</div>
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

      {/* ОДНА ЗАПИСЬ */}
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

      {/* ОДНА СМЕНА */}
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

      {/* МАССОВО */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowBulk(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Записать массово</div>

<div className="text-xs text-white/50 mb-2">Клиент</div>
<select value={bulkClient} onChange={e => setBulkClient(e.target.value)} className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }}>
  <option value="">Выбери</option>
  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
</select>

            <div className="text-xs text-white/50 mb-2">Дни недели</div>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6, 0].map(d => (
                <button
                  key={d}
                  onClick={() => toggleBulkDay(d)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold"
                  style={{
                    background: bulkDays.includes(d) ? ORANGE : '#0a0a0a',
                    color: bulkDays.includes(d) ? 'white' : '#666',
                    border: '1px solid #262626',
                  }}
                >
                  {DNS_FULL[d]}
                </button>
              ))}
            </div>

            <div className="mb-4">
  <div className="text-xs text-white/50 mb-2">Время</div>
  <input type="time" value={bulkStart} onChange={e => setBulkStart(e.target.value)} className="w-full p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
</div>

            <div className="text-xs text-white/50 mb-2">Период</div>
            <div className="flex gap-2 mb-4">
              <input type="date" value={bulkFrom} onChange={e => setBulkFrom(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
              <input type="date" value={bulkTo} onChange={e => setBulkTo(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            </div>

            <div className="text-xs text-white/40 mb-4">
              Будет создано: {bulkDays.length} дня в неделю × ~{Math.round((new Date(bulkTo).getTime() - new Date(bulkFrom).getTime()) / 86400000 / 7) || 0} недель
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowBulk(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>
                Отмена
              </button>
              <button onClick={runBulk} disabled={bulkBusy} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: ORANGE }}>
                {bulkBusy ? 'Создаю...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDel && (
  <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowBulkDel(false)}>
    <div className="w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
      <div className="text-lg font-black uppercase mb-4" style={{ color: '#ef4444' }}>Удалить массово</div>

      <div className="text-xs text-white/50 mb-2">Клиент</div>
      <select value={delClient} onChange={e => setDelClient(e.target.value)} className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }}>
        <option value="">Выбери</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <div className="text-xs text-white/50 mb-2">Дни недели (необязательно)</div>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 0].map(d => (
          <button
            key={d}
            onClick={() => toggleDelDay(d)}
            className="flex-1 py-2 rounded-lg text-xs font-bold"
            style={{
              background: delDays.includes(d) ? '#ef4444' : '#0a0a0a',
              color: delDays.includes(d) ? 'white' : '#666',
              border: '1px solid #262626',
            }}
          >
            {DNS_FULL[d]}
          </button>
        ))}
      </div>
      <div className="text-xs text-white/30 mb-4">Если дни не выбраны — удалит все записи клиента за период</div>

      <div className="text-xs text-white/50 mb-2">Период</div>
      <div className="flex gap-2 mb-4">
        <input type="date" value={delFrom} onChange={e => setDelFrom(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
        <input type="date" value={delTo} onChange={e => setDelTo(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowBulkDel(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>
          Отмена
        </button>
        <button onClick={runBulkDelete} disabled={delBusy} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#ef4444' }}>
          {delBusy ? 'Удаляю...' : 'Удалить'}
        </button>
      </div>
    </div>
  </div>
)}

      <TabBar />
    </div>
  );
}