'use client';

import { CardsSkeleton } from '../lib/Skeleton';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer, signOut, createInvite } from '../lib/auth';
import { Client } from '../lib/types';
import TabBar from '../lib/TabBar';

const ORANGE = '#FF4A1C';

export default function Dashboard() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFormat, setNewFormat] = useState('Перс-10');
  const [newRest, setNewRest] = useState('0');

useEffect(() => {
  loadData();
  // Prefetch остальных вкладок — Next.js подгружает их в фоне
  ['/schedule', '/clients', '/analytics', '/finance', '/requests'].forEach(r => router.prefetch(r));
}, []);

  async function loadData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { router.push('/'); return; }

  const t = await getTrainer();

// Если это не тренер — отправляем в кабинет клиента
if (!t) {
  router.push('/cabinet');
  return;
}
  setTrainer(t);

  const { data: c } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
  setClients(c || []);

  const start = new Date();
  start.setDate(1);
  const { data: p } = await supabase.from('payments')
    .select('amount')
    .eq('trainer_id', t.id)
    .gte('date', start.toISOString().split('T')[0]);
  setPayments(p || []);

  setLoading(false);
}

  async function addClient() {
    if (!newName.trim() || !trainer) return;
    const { error } = await supabase.from('clients').insert({
      trainer_id: trainer.id,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      format: newFormat,
      rest: parseInt(newRest) || 0,
    });
    if (error) { alert(error.message); return; }
    setNewName(''); setNewPhone(''); setNewFormat('Перс-10'); setNewRest('0');
    setShowAdd(false);
    loadData();
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm('Удалить ' + name + '?')) return;
    await supabase.from('clients').delete().eq('id', id);
    loadData();
  }

  async function makeInvite() {
    const res = await createInvite();
    if (res.error) { alert(res.error); return; }
    const url = window.location.origin + '/invite/' + res.token;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Ссылка скопирована:\n\n' + url);
    } else {
      prompt('Скопируй:', url);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

if (loading) return <CardsSkeleton />;

  const monthRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const activeClients = clients.filter(c => c.rest > 0).length;
  const lowRest = clients.filter(c => c.rest > 0 && c.rest <= 3);
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* HEADER */}
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">{greet},</div>
        <div className="text-3xl font-black uppercase tracking-tight mt-1">{trainer?.name}</div>
      </div>

      <div className="px-5 space-y-4">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Клиентов</div>
            <div className="text-4xl font-black" style={{ color: ORANGE }}>{clients.length}</div>
            <div className="text-xs text-white/50 mt-1">активных: {activeClients}</div>
          </div>
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Выручка · месяц</div>
            <div className="text-2xl font-black" style={{ color: ORANGE }}>{monthRevenue.toLocaleString('ru-RU')}</div>
            <div className="text-xs text-white/50 mt-1">рублей</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowAdd(true)} className="rounded-2xl py-4 font-bold text-sm text-white" style={{ background: ORANGE }}>
            + Клиент
          </button>
          <button onClick={makeInvite} className="rounded-2xl py-4 font-bold text-sm" style={{ background: '#141414', border: '1px solid ' + ORANGE, color: ORANGE }}>
            Пригласить
          </button>
        </div>

        {/* WARNINGS */}
        {lowRest.length > 0 && (
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #fbbf2444' }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#fbbf24' }}>
              Пора напомнить об оплате
            </div>
            {lowRest.map(c => (
              <div key={c.id} className="flex justify-between py-2 border-b border-neutral-900 last:border-0 text-sm">
                <span>{c.name}</span>
                <span style={{ color: '#fbbf24' }}>{c.rest} зан.</span>
              </div>
            ))}
          </div>
        )}

        {/* CLIENTS */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs uppercase tracking-widest text-white/50">Клиенты</div>
          <div className="text-xs text-white/30">{clients.length}</div>
        </div>

        {clients.length === 0 && (
          <div className="rounded-3xl p-8 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
            Добавь первого клиента
          </div>
        )}

        {clients.map(c => (
          <div
            key={c.id}
            className="rounded-2xl p-4 flex justify-between items-center cursor-pointer"
            style={{ background: '#141414', border: '1px solid #262626' }}
            onClick={() => router.push('/client/' + c.id)}
          >
            <div className="flex-1">
              <div className="font-bold text-sm">{c.name}</div>
              <div className="text-xs text-white/50 mt-1">{c.format || 'без формата'}</div>
              {c.phone && <div className="text-xs mt-1" style={{ color: ORANGE }}>{c.phone}</div>}
            </div>
            <div className="flex items-center gap-3">
              {c.rest > 0 && (
                <div className="text-xs px-2 py-1 rounded-full" style={{ background: ORANGE + '22', color: ORANGE }}>
                  {c.rest} зан.
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteClient(c.id, c.name); }}
                className="text-red-500 text-xs font-bold"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD CLIENT MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Новый клиент</div>
            <input placeholder="Имя" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Телефон" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Формат" value={newFormat} onChange={e => setNewFormat(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Остаток" type="number" value={newRest} onChange={e => setNewRest(e.target.value)} className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addClient} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}