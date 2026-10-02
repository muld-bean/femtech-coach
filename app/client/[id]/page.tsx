'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import TabBar from '../../lib/TabBar';

export default function ClientProfile() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editNote, setEditNote] = useState('');

  const [showAddProg, setShowAddProg] = useState(false);
  const [pName, setPName] = useState('');
  const [pDay, setPDay] = useState('1');
  const [pSets, setPSets] = useState('4');
  const [pReps, setPReps] = useState('8');
  const [pWeight, setPWeight] = useState('');

  const [showAddMeas, setShowAddMeas] = useState(false);
  const [mWeight, setMWeight] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mChest, setMChest] = useState('');
  const [mGlutes, setMGlutes] = useState('');
  const [mThigh, setMThigh] = useState('');

  useEffect(() => { loadClient(); }, [id]);

  async function loadClient() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single();
    if (!c) { router.push('/dashboard'); return; }
    setClient(c);

    const { data: s } = await supabase.from('schedule').select('*').eq('client_id', id).gte('date', new Date().toISOString().split('T')[0]).order('date');
    setSchedule(s || []);

    const { data: p } = await supabase.from('program_items').select('*').eq('client_id', id).order('day');
    setProgram(p || []);

    const { data: m } = await supabase.from('measurements').select('*').eq('client_id', id).order('date', { ascending: false });
    setMeasurements(m || []);

    setLoading(false);
  }

  function openEdit() {
    setEditName(client.name);
    setEditPhone(client.phone || '');
    setEditFormat(client.format || '');
    setEditRest(String(client.rest || 0));
    setEditNote(client.note || '');
    setShowEdit(true);
  }

  async function saveEdit() {
    const { error } = await supabase.from('clients').update({
      name: editName,
      phone: editPhone || null,
      format: editFormat,
      rest: parseInt(editRest) || 0,
      note: editNote || null,
    }).eq('id', id);
    if (error) { alert(error.message); return; }
    setShowEdit(false);
    loadClient();
  }

  async function addToRest(delta: number) {
    if (!client) return;
    const newRest = Math.max(0, client.rest + delta);
    await supabase.from('clients').update({ rest: newRest }).eq('id', id);
    loadClient();
  }

  async function addProgram() {
    if (!pName.trim()) return;
    const { error } = await supabase.from('program_items').insert({
      client_id: id,
      week_start: new Date().toISOString().split('T')[0],
      day: parseInt(pDay),
      ord: program.filter(p => p.day === parseInt(pDay)).length + 1,
      name: pName.trim(),
      sets: pSets,
      reps: pReps,
      weight: pWeight,
    });
    if (error) { alert(error.message); return; }
    setPName(''); setPSets('4'); setPReps('8'); setPWeight('');
    setShowAddProg(false);
    loadClient();
  }

  async function deleteProgram(pid: string) {
    if (!confirm('Удалить упражнение?')) return;
    await supabase.from('program_items').delete().eq('id', pid);
    loadClient();
  }

  async function addMeasurement() {
    if (!mWeight && !mWaist && !mChest && !mGlutes && !mThigh) {
      alert('Введи хотя бы один замер');
      return;
    }
    const { error } = await supabase.from('measurements').insert({
      client_id: id,
      date: new Date().toISOString().split('T')[0],
      weight: mWeight || null,
      waist: mWaist || null,
      chest: mChest || null,
      glutes: mGlutes || null,
      thigh: mThigh || null,
    });
    if (error) { alert(error.message); return; }
    setMWeight(''); setMWaist(''); setMChest(''); setMGlutes(''); setMThigh('');
    setShowAddMeas(false);
    loadClient();
  }

  async function deleteMeasurement(mid: string) {
    if (!confirm('Удалить замер?')) return;
    await supabase.from('measurements').delete().eq('id', mid);
    loadClient();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl">
        <button onClick={() => router.push('/dashboard')} className="text-sm opacity-80 mb-3">Назад</button>
        <div className="text-3xl font-bold">{client.name}</div>
        <div className="text-sm opacity-80 mt-1">{client.format || 'без формата'}</div>
        {client.phone && <div className="text-sm opacity-90 mt-2">{client.phone}</div>}
      </div>

      <div className="p-4">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-2">Остаток занятий</div>
          <div className="text-5xl font-bold text-purple-700 text-center my-3">{client.rest}</div>
          <div className="flex gap-2">
            <button onClick={() => addToRest(-1)} className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-bold">Минус 1</button>
            <button onClick={() => addToRest(1)} className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-bold">Плюс 1</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-bold">Данные</div>
            <button onClick={openEdit} className="text-purple-700 font-semibold text-sm">Изменить</button>
          </div>
          <div className="text-sm py-2 border-b border-gray-100 flex justify-between">
            <span className="text-gray-500">Телефон</span>
            <span className="font-semibold">{client.phone || '-'}</span>
          </div>
          <div className="text-sm py-2 border-b border-gray-100 flex justify-between">
            <span className="text-gray-500">Формат</span>
            <span className="font-semibold">{client.format || '-'}</span>
          </div>
          {client.note && (
            <div className="text-sm py-2 bg-yellow-50 -mx-5 px-5 mt-2 rounded-b-2xl">
              <div className="text-gray-500 mb-1">Заметка</div>
              <div>{client.note}</div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="text-lg font-bold mb-3">Расписание</div>
          {schedule.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">Нет предстоящих тренировок</div>
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
          <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-bold">Программа</div>
            <button onClick={() => setShowAddProg(true)} className="text-purple-700 font-semibold text-sm">+ Упражнение</button>
          </div>
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
                    <div key={p.id} className="py-2 border-b border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sets || '?'} × {p.reps || '?'} {p.weight || ''}</div>
                      </div>
                      <button onClick={() => deleteProgram(p.id)} className="text-red-500 text-xs font-bold px-2">Удалить</button>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="text-lg font-bold">Замеры</div>
            <button onClick={() => setShowAddMeas(true)} className="text-purple-700 font-semibold text-sm">+ Замер</button>
          </div>
          {measurements.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">Замеров пока нет</div>
          ) : (
            <div>
              <div className="bg-purple-50 rounded-xl p-3 mb-3">
                <div className="text-xs text-gray-600 mb-2">Последний</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {measurements[0].weight && <div>Вес: <b>{measurements[0].weight}</b></div>}
                  {measurements[0].waist && <div>Талия: <b>{measurements[0].waist}</b></div>}
                  {measurements[0].chest && <div>Грудь: <b>{measurements[0].chest}</b></div>}
                  {measurements[0].glutes && <div>Ягодицы: <b>{measurements[0].glutes}</b></div>}
                  {measurements[0].thigh && <div>Бедро: <b>{measurements[0].thigh}</b></div>}
                </div>
                <div className="text-xs text-gray-400 mt-2">{measurements[0].date}</div>
              </div>
              {measurements.slice(1, 6).map(m => (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="text-sm">
                    <div className="font-semibold">{m.date}</div>
                    <div className="text-xs text-gray-500">
                      {[m.weight && 'Вес ' + m.weight, m.waist && 'Талия ' + m.waist].filter(Boolean).join(' / ')}
                    </div>
                  </div>
                  <button onClick={() => deleteMeasurement(m.id)} className="text-red-500 text-xs font-bold">Удалить</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Изменить</h3>
            <input placeholder="Имя" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Телефон" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Формат" value={editFormat} onChange={e => setEditFormat(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input placeholder="Остаток" type="number" value={editRest} onChange={e => setEditRest(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <textarea placeholder="Заметка" value={editNote} onChange={e => setEditNote(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" rows={3} />
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={saveEdit} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showAddProg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новое упражнение</h3>
            <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Жим лёжа" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <select value={pDay} onChange={e => setPDay(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3">
              <option value="1">День 1</option>
              <option value="2">День 2</option>
              <option value="3">День 3</option>
              <option value="4">День 4</option>
              <option value="5">День 5</option>
            </select>
            <div className="flex gap-2 mb-3">
              <input value={pSets} onChange={e => setPSets(e.target.value)} placeholder="Подходы" className="w-full p-3 border-2 border-gray-200 rounded-xl" />
              <input value={pReps} onChange={e => setPReps(e.target.value)} placeholder="Повторы" className="w-full p-3 border-2 border-gray-200 rounded-xl" />
            </div>
            <input value={pWeight} onChange={e => setPWeight(e.target.value)} placeholder="Вес" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddProg(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addProgram} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showAddMeas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новый замер</h3>
            <input value={mWeight} onChange={e => setMWeight(e.target.value)} placeholder="Вес (кг)" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={mChest} onChange={e => setMChest(e.target.value)} placeholder="Грудь (см)" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={mWaist} onChange={e => setMWaist(e.target.value)} placeholder="Талия (см)" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={mGlutes} onChange={e => setMGlutes(e.target.value)} placeholder="Ягодицы (см)" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3" />
            <input value={mThigh} onChange={e => setMThigh(e.target.value)} placeholder="Бедро (см)" className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddMeas(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={addMeasurement} className="flex-1 py-3 bg-purple-700 text-white rounded-xl font-bold">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}