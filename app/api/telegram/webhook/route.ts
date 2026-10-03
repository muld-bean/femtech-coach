import { NextResponse } from 'next/server';
import { sendToTrainer, sendTelegram } from '../../../../lib/telegram';

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg || !msg.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text = String(msg.text).trim();
    const name = msg.from?.first_name || 'Друг';

    if (text === '/start') {
      await sendTelegram(
        chatId,
        `Привет, ${name}! 👋\n\nТы подключён к боту тренера. Здесь будут напоминания о тренировках и ответы на твои вопросы.`
      );
      return NextResponse.json({ ok: true });
    }

    await sendToTrainer(
      `📩 <b>Сообщение от клиента</b>\n\n<b>${name}</b> (id: <code>${chatId}</code>):\n\n${text}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}