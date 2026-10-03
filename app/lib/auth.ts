import { supabase } from './supabase';

function phoneToEmail(phone: string) {
  const clean = phone.replace(/\D/g, '');
  return clean + '@crm.local';
}

function cleanPhone(phone: string) {
  let s = String(phone).replace(/\D/g, '');
  if (s.length === 11 && s[0] === '8') s = '7' + s.slice(1);
  if (s.length === 10) s = '7' + s;
  return s;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTrainer() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('trainers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}

export async function signUp(phone: string, password: string, name: string) {
  const clean = cleanPhone(phone);
  const email = phoneToEmail(clean);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'Этот телефон уже зарегистрирован' };
    }
    return { error: error.message };
  }
  if (!data.user) return { error: 'Не удалось создать аккаунт' };

  const { error: trErr } = await supabase.from('trainers').insert({
    user_id: data.user.id,
    phone: clean,
    name,
  });
  if (trErr) return { error: trErr.message };

  return { success: true };
}

export async function signIn(phone: string, password: string) {
  const clean = cleanPhone(phone);
  const email = phoneToEmail(clean);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Неверный телефон или пароль' };
  return { success: true };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function createInvite() {
  const trainer = await getTrainer();
  if (!trainer) return { error: 'Тренер не найден' };

  const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

  const { data, error } = await supabase.from('invites').insert({
    token,
    trainer_id: trainer.id,
    status: 'активна',
  }).select().single();

  if (error) return { error: error.message };
  return { success: true, token: data.token };
}

export async function getInvite(token: string) {
  const { data } = await supabase
    .from('invites')
    .select('*, trainers(name)')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export async function registerClientByInvite(token: string, phone: string, password: string, name: string) {
  const invite = await getInvite(token);
  if (!invite) return { error: 'Ссылка не найдена' };
  if (invite.status !== 'активна') return { error: 'Ссылка уже использована' };

  const clean = cleanPhone(phone);
  const email = phoneToEmail(clean);

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'Этот телефон уже зарегистрирован. Попробуйте войти.' };
    }
    return { error: error.message };
  }
  if (!data.user) return { error: 'Не удалось создать аккаунт' };

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) return { error: 'Сессия не установлена: ' + signInErr.message };
  }

  // Проверяем, есть ли уже клиент с этим телефоном у этого тренера
  const { data: existing } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('trainer_id', invite.trainer_id)
    .eq('phone', clean)
    .maybeSingle();

  if (existing) {
    // Привязываем user_id к существующей записи
    const { error: updErr } = await supabase.from('clients').update({
      user_id: data.user.id,
      name,
    }).eq('id', existing.id);
    if (updErr) return { error: updErr.message };
  } else {
    // Новый клиент — создаём запись
    const { error: insErr } = await supabase.from('clients').insert({
      user_id: data.user.id,
      trainer_id: invite.trainer_id,
      name,
      phone: clean,
      rest: 0,
    });
    if (insErr) return { error: insErr.message };
  }

  await supabase.from('invites').update({ status: 'использована', phone: clean }).eq('id', invite.id);

  return { success: true };
}

export async function signInClient(phone: string, password: string) {
  const clean = cleanPhone(phone);
  const email = phoneToEmail(clean);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Неверный телефон или пароль' };
  return { success: true };
}

export async function getClientByUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}