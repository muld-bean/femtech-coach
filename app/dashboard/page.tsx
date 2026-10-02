'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer, signOut, createInvite } from '../lib/auth';
import { Client } from '../lib/types';
import TabBar from '../lib/TabBar';

export default function Dashboard() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFormat, setNewFormat] = useState('Перс-10');
  const [newRest, setNewRest] = useState('0');
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    setTrainer(t);
    const { data } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(data || []);
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
    if (error) { alert('Ошибка: ' + error.message); return; }
    setNewName(''); setNewPhone(''); setNewFormat('Перс-10'); setNewRest('0');
    setShowAdd(false);
    loadData();
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm('Удалить клиента ' + name + '?')) return;
    await supabase.from('clients').delete().eq('id', id);
    loadData();
  }

  async function makeInvite() {
    const res = await createInvite();
    if (res.error) { alert(res.error); return; }
    const base = window.location.origin;
    const url = base + '/invite/' + res.token;
    setInviteUrl(url);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Ссылка скопирована:\n\n' + url + '\n\nОтправь клиенту.');
    } else {
      prompt('Скопируй ссылку:', url);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm opacity-80">Тренер</div>
            <div className="text-2xl font-bold">{trainer?.name}</div>
          </div>
          <button onClick={handleSignOut} className="bg-white/20 px-4 py-2 rounded-full text-sm">
            Выйти
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="text-3xl font-bold">{clients.length}</div>
            <div className="text-xs opacity-80">Клиентов</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="text-3xl font-bold">{clients.filter(c => c.rest > 0).length}</div>
            <div className="text-xs opacity-80">Активных</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setShowAdd(true)} className="flex-1 bg-purple-700 text-white px-4 py-3 rounded-xl text-sm font-bold">
            + Клиент
          </button>
          <button onClick={makeInvite} className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold">
            Ссылка-приглашение
          </button>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3 mt-4">Мои клиенты</h2>

        {clients.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            Пока нет клиентов
          </div>
        )}

        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex justify-between items-center">
            <div onClick={() => router.push('/client/' + c.id)} className="flex-1 cursor-pointer">
              <div className="font-bold text-gray-800">{c.name}</div>
              <div className="text-sm text-gray-500">{c.format || 'без формата'}</div>
              {c.phone && <div className="text-sm text-purple-600 mt-1">{c.phone}</div>}
              {c.rest > 0 && <div className="text-sm text-green-700 mt-1 font-semibold">Остаток: {c.rest}</div>}
            </div>
            <button onClick={() => deleteClient(c.id, c.name)} className="text-red-500 px-3 py-2 text-sm">
              Удалить
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый клиент</h3>
            <input placeholder="Имя" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Телефон" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Формат" value={newFormat} onChange={e => setNewFormat(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Остаток" type="number" value={newRest} onChange={e => setNewRest(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addClient} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}