import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendToTrainer, sendTelegram } from '../../../lib/telegram';

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg || !msg.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text = String(msg.text).trim();
    const name = msg.from?.first_name || 'Друг';

    // /start с параметром c_<client_id> — привязка клиента
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts[1] || '';

      if (payload.startsWith('c_')) {
        const clientId = payload.slice(2);
        const { error } = await supabaseAdmin
          .from('clients')
          .update({ telegram_chat_id: String(chatId) })
          .eq('id', clientId);

        if (error) {
          await sendTelegram(chatId, 'Не удалось привязать аккаунт. Попроси тренера скинуть ссылку заново.');
        } else {
          await sendTelegram(
            chatId,
            `Привет, ${name}! 👋\n\nТеперь я буду присылать напоминания о тренировках и важные события.`
          );
        }
        return NextResponse.json({ ok: true });
      }

      // Обычный /start
      await sendTelegram(
        chatId,
        `Привет, ${name}! 👋\n\nЭто бот тренера. Здесь будут напоминания о тренировках.`
      );
      return NextResponse.json({ ok: true });
    }

    // Остальное — пересылаем тренеру
    await sendToTrainer(
      `📩 <b>Сообщение от клиента</b>\n\n<b>${name}</b> (id: <code>${chatId}</code>):\n\n${text}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}