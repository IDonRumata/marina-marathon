// api/register.js

export default async function handler(req, res) {
  // 1. Настройка заголовков CORS (разрешаем запросы с твоего сайта)
  // В vercel.json они уже есть, но для надежности в функции можно продублировать или опустить.
  // Здесь мы полагаемся на логику vercel.json, но обработаем OPTIONS метод.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, surname, email, phone, telegram, website } = req.body;

    // --- 2. ПРОВЕРКА HONEYPOT (Защита от спама) ---
    // Если скрытое поле 'website' заполнено, значит это бот.
    // Мы не сохраняем данные, но возвращаем успех, чтобы обмануть бота.
    if (website && website.length > 0) {
      console.log('Bot detected via honeypot');
      return res.status(200).json({ success: true, message: 'Bot detected, skipped' });
    }

    // Проверка обязательных полей
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Получаем переменные окружения
    const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;

    // --- 3. ПОДГОТОВКА СООБЩЕНИЯ ДЛЯ TELEGRAM ---
    const messageText = `
🚀 <b>Новая регистрация на Марафон!</b>

👤 <b>Имя:</b> ${name} ${surname}
📧 <b>Email:</b> ${email}
📱 <b>Телефон:</b> ${phone}
✈️ <b>Telegram:</b> ${telegram || 'Не указан'}
`;

    // --- 4. ОТПРАВКА ДАННЫХ (Параллельно) ---
    // Мы используем Promise.all, чтобы отправить данные и в ТГ, и в Таблицу одновременно.
    // Это ускоряет ответ пользователю.

    const tasks = [];

    // Задача 1: Отправка в Telegram
    if (TG_BOT_TOKEN && TG_CHAT_ID) {
      const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
      tasks.push(
        fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TG_CHAT_ID,
            text: messageText,
            parse_mode: 'HTML'
          })
        }).then(r => {
             if (!r.ok) console.error('Telegram Error:', r.statusText);
             return r;
        })
      );
    } else {
        console.warn('Telegram token or Chat ID missing');
    }

    // Задача 2: Отправка в Google Sheets
    if (GOOGLE_SHEET_URL) {
      tasks.push(
        fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          // Google Apps Script иногда требует follow redirects, fetch в Node 18+ справляется
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            surname,
            email,
            phone,
            telegram
          })
        }).then(r => {
            // Google Script возвращает редиректы, это нормально.
            // Главное, чтобы запрос ушел.
            return r;
        })
      );
    } else {
        console.warn('Google Sheet URL missing');
    }

    // Ждем выполнения всех задач
    await Promise.all(tasks);

    // --- 5. УСПЕШНЫЙ ОТВЕТ ФРОНТЕНДУ ---
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}