'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

const ORANGE = '#FF4A1C';

export default function Finance() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [selClient, setSelClient] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => { loadData(); }, [month, year]);

  async function loadData() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }

    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 1).toISOString().split('T')[0];

    const { data: p } = await supabase.from('payments')
      .select('*, clients(name)')
      .eq('trainer_id', t.id)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false });
    setPayments(p || []);

    const { data: c } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(c || []);
    setLoading(false);
  }

  async function addPayment() {
    const t = await getTrainer();
    if (!t || !selClient || !amount) return;
    const { error } = await supabase.from('payments').insert({
      trainer_id: t.id,
      client_id: selClient,
      amount: parseInt(amount),
      date,
      format: format || null,
      comment: comment || null,
    });
    if (error) { alert(error.message); return; }
    setAmount(''); setComment(''); setShowAdd(false);
    loadData();
  }

  async function removePayment(pid: string) {
    if (!confirm('Удалить платёж?')) return;
    await supabase.from('payments').delete().eq('id', pid);
    loadData();
  }

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const tax = Math.round(revenue * 0.04);
  const acq = Math.round(revenue * 0.007);
  const rent = 7000;
  const net = revenue - tax - acq - rent;

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Финансы</div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={prevMonth} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>←</button>
          <div className="text-sm font-bold">{monthNames[month]} {year}</div>
          <button onClick={nextMonth} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#141414', border: '1px solid #262626' }}>→</button>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="rounded-3xl p-6" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Выручка</div>
          <div className="text-4xl font-black" style={{ color: ORANGE }}>{revenue.toLocaleString('ru-RU')} ₽</div>
        </div>

        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Расходы</div>
          <div className="flex justify-between py-2 border-b border-neutral-900">
            <span className="text-sm text-white/60">Налог 4%</span>
            <span className="text-sm font-semibold">− {tax.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-900">
            <span className="text-sm text-white/60">Эквайринг 0.7%</span>
            <span className="text-sm font-semibold">− {acq.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-white/60">Аренда</span>
            <span className="text-sm font-semibold">− {rent.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid ' + (net >= 0 ? '#4ade8033' : '#ef444433') }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Чистыми</div>
          <div className="text-3xl font-black" style={{ color: net >= 0 ? '#4ade80' : '#ef4444' }}>{net.toLocaleString('ru-RU')} ₽</div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs uppercase tracking-widest text-white/50">Платежи</div>
          <button onClick={() => setShowAdd(true)} className="text-xs font-bold px-3 py-2 rounded-xl text-white" style={{ background: ORANGE }}>+ Платёж</button>
        </div>

        {payments.length === 0 && (
          <div className="rounded-3xl p-8 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
            Нет платежей за месяц
          </div>
        )}

        {payments.map(p => (
          <div key={p.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div>
              <div className="font-bold text-sm">{p.clients?.name || '—'}</div>
              <div className="text-xs text-white/50 mt-1">{p.date} · {p.format || ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-black" style={{ color: ORANGE }}>{p.amount.toLocaleString('ru-RU')} ₽</div>
              <button onClick={() => removePayment(p.id)} className="text-red-400 text-xs font-bold">×</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Новый платёж</div>
            <select value={selClient} onChange={e => setSelClient(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }}>
              <option value="">Выбери клиента</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Сумма" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={format} onChange={e => setFormat(e.target.value)} placeholder="Формат" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий" className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addPayment} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}