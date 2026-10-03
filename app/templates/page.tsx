'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';

export default function Templates() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const [showAddItem, setShowAddItem] = useState(false);
  const [iName, setIName] = useState('');
  const [iDay, setIDay] = useState('1');
  const [iSets, setISets] = useState('4');
  const [iReps, setIReps] = useState('8');
  const [iWeight, setIWeight] = useState('');

  const [showApply, setShowApply] = useState(false);
  const [applyClient, setApplyClient] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }
    const { data: tpl } = await supabase.from('templates').select('*').eq('trainer_id', t.id).order('name');
    setTemplates(tpl || []);
    const { data: c } = await supabase.from('clients').select('*').eq('trainer_id', t.id).order('name');
    setClients(c || []);
    setLoading(false);
  }

  async function openTemplate(id: string) {
    setOpenId(id);
    const { data } = await supabase.from('template_items').select('*').eq('template_id', id).order('day').order('ord');
    setItems(data || []);
  }

  async function createTemplate() {
    if (!newName.trim()) return;
    const t = await getTrainer();
    if (!t) return;
    const { error } = await supabase.from('templates').insert({ trainer_id: t.id, name: newName.trim() });
    if (error) { alert(error.message); return; }
    setNewName('');
    setShowNew(false);
    load();
  }

  async function addItem() {
    if (!openId || !iName.trim()) return;
    const { error } = await supabase.from('template_items').insert({
      template_id: openId,
      day: parseInt(iDay),
      ord: items.filter(x => x.day === parseInt(iDay)).length + 1,
      name: iName.trim(),
      sets: iSets,
      reps: iReps,
      weight: iWeight,
    });
    if (error) { alert(error.message); return; }
    setIName(''); setISets('4'); setIReps('8'); setIWeight('');
    setShowAddItem(false);
    openTemplate(openId);
  }

  async function removeItem(id: string) {
    await supabase.from('template_items').delete().eq('id', id);
    if (openId) openTemplate(openId);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Удалить шаблон?')) return;
    await supabase.from('templates').delete().eq('id', id);
    setOpenId(null);
    load();
  }

  async function applyToClient() {
    if (!openId || !applyClient) return;
    const tplItems = items;
    for (const it of tplItems) {
      await supabase.from('program_items').insert({
        client_id: applyClient,
        week_start: new Date().toISOString().split('T')[0],
        day: it.day,
        ord: it.ord,
        name: it.name,
        sets: it.sets,
        reps: it.reps,
        weight: it.weight,
        note: it.note,
      });
    }
    alert('Применено упражнений: ' + tplItems.length);
    setShowApply(false);
    setOpenId(null);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  const openedTemplate = templates.find(t => t.id === openId);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-bold">Шаблоны программ</div>
            <div className="text-sm opacity-80 mt-1">Всего: {templates.length}</div>
          </div>
          <button onClick={() => setShowNew(true)} className="bg-white/20 px-4 py-2 rounded-full text-sm font-bold">
            + Шаблон
          </button>
        </div>
      </div>

      <div className="p-4">
        {templates.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            Нет шаблонов. Нажми «+ Шаблон».
          </div>
        )}
        {templates.map(t => (
          <div key={t.id} onClick={() => openTemplate(t.id)} className="bg-white rounded-2xl p-4 mb-3 shadow-sm cursor-pointer">
            <div className="font-bold text-gray-800">{t.name}</div>
          </div>
        ))}
      </div>

      {openId && openedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{openedTemplate.name}</h3>
              <button onClick={() => setOpenId(null)} className="text-gray-400 text-2xl">×</button>
            </div>

            {[1,2,3,4,5].map(day => {
              const dayItems = items.filter(x => x.day === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="mb-3">
                  <div className="text-xs font-bold text-purple-700 mb-1">День {day}</div>
                  {dayItems.map(it => (
                    <div key={it.id} className="py-2 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{it.name}</div>
                        <div className="text-xs text-gray-500">{it.sets || '?'}×{it.reps || '?'} {it.weight || ''}</div>
                      </div>
                      <button onClick={() => removeItem(it.id)} className="text-red-500 text-xs font-bold">Удалить</button>
                    </div>
                  ))}
                </div>
              );
            })}

            <button onClick={() => setShowAddItem(true)} className="w-full py-3 bg-purple-100 text-purple-700 rounded-xl font-bold mb-2">
              + Упражнение
            </button>
            <button onClick={() => setShowApply(true)} className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold mb-2">
              Применить к клиенту
            </button>
            <button onClick={() => deleteTemplate(openId)} className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold">
              Удалить шаблон
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый шаблон</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Силовой А" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={createTemplate} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Создать</button>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Упражнение</h3>
            <input value={iName} onChange={e => setIName(e.target.value)} placeholder="Жим лёжа" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <select value={iDay} onChange={e => setIDay(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3">
              <option value="1">День 1</option>
              <option value="2">День 2</option>
              <option value="3">День 3</option>
              <option value="4">День 4</option>
              <option value="5">День 5</option>
            </select>
            <div className="flex gap-2 mb-3">
              <input value={iSets} onChange={e => setISets(e.target.value)} placeholder="Подходы" className="w-full p-3 border-2 border-gray-200 rounded-xl" />
              <input value={iReps} onChange={e => setIReps(e.target.value)} placeholder="Повторы" className="w-full p-3 border-2 border-gray-200 rounded-xl" />
            </div>
            <input value={iWeight} onChange={e => setIWeight(e.target.value)} placeholder="Вес" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddItem(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addItem} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Добавить</button>
            </div>
          </div>
        </div>
      )}

      {showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">К какому клиенту?</h3>
            <select value={applyClient} onChange={e => setApplyClient(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4">
              <option value="">Выбери клиента</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowApply(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={applyToClient} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Применить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}