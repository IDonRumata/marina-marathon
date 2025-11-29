// ==========================================================
// 🔒 VERCEL SERVERLESS FUNCTION ДЛЯ БЕЗОПАСНОЙ ОТПРАВКИ
// ==========================================================
// Этот файл выполняется на сервере Vercel
// Токен хранится в переменных окружения и недоступен публично

export default async function handler(req, res) {
    // ========================================
    // CORS заголовки для совместимости
    // ========================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запроса
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method Not Allowed' 
        });
    }

    try {
        // Получаем данные из тела запроса
        const { name, surname, email, phone, telegram, website } = req.body;

        // ========================================
        // Honeypot защита от ботов
        // ========================================
        if (website) {
            console.log('🚫 Spam bot detected via honeypot');
            return res.status(400).json({ 
                success: false, 
                error: 'Spam detected' 
            });
        }

        // Валидация обязательных полей
        if (!name || !surname || !email || !phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Заполните все обязательные поля' 
            });
        }

        // Получаем секретные данные из переменных окружения
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        // Проверяем, что переменные окружения настроены
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error('❌ Переменные окружения не настроены!');
            return res.status(500).json({ 
                success: false, 
                error: 'Конфигурация сервера не завершена' 
            });
        }

        // Формируем сообщение для Telegram
        const message = `
🎯 <b>НОВАЯ РЕГИСТРАЦИЯ</b>

👤 <b>Имя:</b> ${name} ${surname}
📧 <b>Email:</b> ${email}
📱 <b>Телефон:</b> ${phone}
💬 <b>Telegram:</b> ${telegram || 'не указан'}

⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Minsk' })}
        `.trim();

        // Отправляем в Telegram через Bot API
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const telegramData = await telegramResponse.json();

        // Проверяем ответ от Telegram
        if (telegramData.ok) {
            console.log('✅ Сообщение успешно отправлено в Telegram');
            return res.status(200).json({ 
                success: true, 
                message: 'Регистрация успешна!' 
            });
        } else {
            console.error('❌ Ошибка Telegram API:', telegramData);
            return res.status(500).json({ 
                success: false, 
                error: 'Не удалось отправить сообщение в Telegram' 
            });
        }

    } catch (error) {
        console.error('❌ Ошибка в API функции:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера' 
        });
    }
}