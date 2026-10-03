import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../lib/supabase-admin';
import { sendToTrainer } from '../../../lib/telegram';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const p = (n: number) => (n < 10 ? '0' + n : n);
  const todayISO = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate());

  const { data: trainer } = await supabase.from('trainers').select('*').limit(1).single();
  if (!trainer) return NextResponse.json({ ok: false });

  const { data: todaySchedule } = await supabase
    .from('schedule')
    .select('*, clients(name)')
    .eq('trainer_id', trainer.id)
    .eq('date', todayISO)
    .order('time');

  const { data: todayShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('trainer_id', trainer.id)
    .eq('date', todayISO)
    .order('start_time');

  const hour = today.getHours();
  let greet = 'Доброе утро';
  if (hour >= 12 && hour < 18) greet = 'Добрый день';
  else if (hour >= 18) greet = 'Добрый вечер';

  let msg = `<b>${greet}, ${trainer.name}!</b>\n\n`;

  const n = todaySchedule?.length || 0;

  if (n === 0) {
    msg += 'Сегодня тренировок нет. Отдых тоже важен 🖤';
  } else {
    msg += `Сегодня у тебя <b>${n}</b> `;
    msg += n === 1 ? 'тренировка' : n < 5 ? 'тренировки' : 'тренировок';
    msg += '.\n\n';

    const times = todaySchedule!.map((s: any) => String(s.time).slice(0, 5)).sort();
    if (times.length > 0) {
      msg += `Первая в <b>${times[0]}</b>`;
      if (times.length > 1) msg += `, последняя в <b>${times[times.length - 1]}</b>`;
      msg += '.\n\n';
    }

    msg += '<b>Кто сегодня:</b>\n';
    todaySchedule!.forEach((s: any) => {
      msg += `• ${String(s.time).slice(0, 5)} — ${s.clients?.name || 'клиент'}\n`;
    });
  }

  if (todayShifts && todayShifts.length > 0) {
    msg += '\n<b>Смены:</b>\n';
    todayShifts.forEach((s: any) => {
      msg += `• ${s.start_time}–${s.end_time}\n`;
    });
  }

  await sendToTrainer(msg);
  return NextResponse.json({ ok: true, sent: n });
}