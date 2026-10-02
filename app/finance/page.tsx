'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

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

    const { data: p } = await supabase.from('payments').select('*, clients(name)').eq('trainer_id', t.id).gte('date', start).lt('date', end).order('date', { ascending: false });
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="text-2xl font-bold">Финансы</div>
        <div className="flex justify-between items-center mt-4">
          <button onClick={prevMonth} className="bg-white/20 px-4 py-2 rounded-xl">Назад</button>
          <div className="font-semibold">{monthNames[month]} {year}</div>
          <button onClick={nextMonth} className="bg-white/20 px-4 py-2 rounded-xl">Вперёд</button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Выручка за месяц</div>
          <div className="text-4xl font-bold text-purple-700">{revenue.toLocaleString('ru-RU')} р.</div>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-lg font-bold mb-3">Расходы</div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Налог 4%</span>
            <span className="font-semibold">- {tax.toLocaleString('ru-RU')} р.</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Эквайринг 0.7%</span>
            <span className="font-semibold">- {acq.toLocaleString('ru-RU')} р.</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Аренда</span>
            <span className="font-semibold">- {rent.toLocaleString('ru-RU')} р.</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-lg font-bold mb-3">Чистыми</div>
          <div className={'text-3xl font-bold ' + (net >= 0 ? 'text-green-600' : 'text-red-600')}>
            {net.toLocaleString('ru-RU')} р.
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-bold">Платежи</div>
            <button onClick={() => setShowAdd(true)} className="bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold">+ Платёж</button>
          </div>
          {payments.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">Нет платежей</div>
          ) : (
            payments.map(p => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <div className="font-semibold">{p.clients?.name || 'Клиент'}</div>
                  <div className="text-xs text-gray-500">{p.date} · {p.format || ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-700">{p.amount.toLocaleString('ru-RU')} р.</span>
                  <button onClick={() => removePayment(p.id)} className="text-red-500 text-xs font-bold">Удалить</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый платёж</h3>
            <select value={selClient} onChange={e => setSelClient(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3">
              <option value="">Выбери клиента</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Сумма" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={format} onChange={e => setFormat(e.target.value)} placeholder="Формат" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addPayment} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}