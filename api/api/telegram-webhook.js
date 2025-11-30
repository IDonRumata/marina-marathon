// api/telegram-webhook.js
// Webhook для обработки сообщений от Telegram бота

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    
    // Проверяем что это сообщение
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || '';
    const user = message.from;
    
    // Получаем username (может быть undefined)
    const username = user.username || '';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';

    // Переменные окружения
    const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TG_ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Chat ID Марины
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;

    // --- ОБРАБОТКА /start С DEEP LINK ---
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const uniqueId = parts[1] || null; // Получаем ID из deep link

      if (uniqueId) {
        // --- ЕСТЬ ID: Связываем с регистрацией ---
        
        // 1. Обновляем Google Sheets
        let userName = '';
        if (GOOGLE_SHEET_URL) {
          try {
            const sheetResponse = await fetch(GOOGLE_SHEET_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_telegram',
                id: uniqueId,
                telegram_username: username ? `@${username}` : `${firstName} ${lastName}`.trim(),
                chat_id: chatId.toString()
              })
            });
            
            const sheetData = await sheetResponse.json();
            if (sheetData.user_name) {
              userName = sheetData.user_name;
            }
          } catch (err) {
            console.error('Google Sheets update error:', err);
          }
        }

        // 2. Отправляем приветствие пользователю
        const welcomeMessage = `
🎉 <b>Добро пожаловать на Финансовый Краш-тест!</b>

${userName ? `Привет, ${userName}! ` : ''}Ты успешно зарегистрировался!

📋 <b>Что дальше:</b>
1. Оплати участие $5
2. Получи доступ к материалам
3. Начни свой путь к финансовой свободе!

💳 <b>Для оплаты напиши:</b> "Хочу оплатить"

❓ Есть вопросы? Просто напиши сюда!
`;

        await sendTelegramMessage(TG_BOT_TOKEN, chatId, welcomeMessage);

        // 3. Уведомляем Марину
        const adminNotification = `
✅ <b>Пользователь подтвердил регистрацию!</b>

🔑 <b>ID:</b> ${uniqueId}
👤 <b>Telegram:</b> ${username ? `@${username}` : `${firstName} ${lastName}`}
💬 <b>Chat ID:</b> ${chatId}

Можно связаться: <a href="tg://user?id=${chatId}">Написать</a>
`;

        await sendTelegramMessage(TG_BOT_TOKEN, TG_ADMIN_CHAT_ID, adminNotification);

      } else {
        // --- НЕТ ID: Обычный /start ---
        const defaultMessage = `
👋 <b>Привет!</b>

Это бот Финансового Краш-теста Марины Дементьевой.

🌐 Чтобы зарегистрироваться, перейди на сайт:
https://fin-crash.vercel.app

После регистрации ты автоматически получишь доступ к боту!
`;

        await sendTelegramMessage(TG_BOT_TOKEN, chatId, defaultMessage);
      }

      return res.status(200).json({ ok: true });
    }

    // --- ОБРАБОТКА "ХОЧУ ОПЛАТИТЬ" ---
    if (text.toLowerCase().includes('оплат')) {
      const paymentMessage = `
💳 <b>Оплата участия в Краш-тесте</b>

Стоимость: <b>$5</b>

📲 <b>Способы оплаты:</b>
1. Перевод на карту: [номер карты]
2. PayPal: [email]
3. Крипто (USDT): [адрес]

После оплаты отправь скриншот сюда, и мы активируем твой доступ!
`;

      await sendTelegramMessage(TG_BOT_TOKEN, chatId, paymentMessage);

      // Уведомляем Марину
      const paymentNotification = `
💰 <b>Пользователь хочет оплатить!</b>

👤 <b>Telegram:</b> ${username ? `@${username}` : `${firstName} ${lastName}`}
💬 <b>Chat ID:</b> ${chatId}

<a href="tg://user?id=${chatId}">Написать пользователю</a>
`;

      await sendTelegramMessage(TG_BOT_TOKEN, TG_ADMIN_CHAT_ID, paymentNotification);

      return res.status(200).json({ ok: true });
    }

    // --- ПЕРЕСЫЛКА ОСТАЛЬНЫХ СООБЩЕНИЙ МАРИНЕ ---
    const forwardMessage = `
📩 <b>Новое сообщение от пользователя:</b>

👤 ${username ? `@${username}` : `${firstName} ${lastName}`}
💬 Chat ID: ${chatId}

📝 <b>Сообщение:</b>
${text}

<a href="tg://user?id=${chatId}">Ответить</a>
`;

    await sendTelegramMessage(TG_BOT_TOKEN, TG_ADMIN_CHAT_ID, forwardMessage);

    // Автоответ пользователю
    const autoReply = `
✉️ Твоё сообщение получено! Марина скоро ответит.
`;

    await sendTelegramMessage(TG_BOT_TOKEN, chatId, autoReply);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ ok: true }); // Всегда 200 для Telegram
  }
}

// --- ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ ---
async function sendTelegramMessage(botToken, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (error) {
    console.error('Send message error:', error);
  }
}