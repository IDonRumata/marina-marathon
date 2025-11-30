// api/register.js
// С reCAPTCHA v3, Rate Limiting и улучшенной валидацией

// --- ПРОСТОЙ IN-MEMORY RATE LIMITER ---
// Хранит IP адреса и время последних запросов
// Примечание: на Vercel Serverless это работает ограниченно (сбрасывается при cold start),
// но всё равно защищает от быстрых атак
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 минута
const RATE_LIMIT_MAX = 5; // Максимум 5 запросов в минуту с одного IP

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Получаем записи для этого IP
  const requests = rateLimitMap.get(ip) || [];
  
  // Фильтруем только запросы в текущем окне
  const recentRequests = requests.filter(time => time > windowStart);
  
  // Проверяем лимит
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false; // Лимит превышен
  }
  
  // Добавляем текущий запрос
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
  // Очистка старых записей (каждые 100 запросов)
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      const filtered = value.filter(time => time > windowStart);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }
  
  return true; // OK
}

// --- ВАЛИДАЦИЯ EMAIL ---
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// --- ВАЛИДАЦИЯ ТЕЛЕФОНА (базовая) ---
function isValidPhone(phone) {
  // Минимум 6 цифр
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6;
}

// --- САНИТИЗАЦИЯ ТЕКСТА (защита от XSS/injection) ---
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 500); // Ограничиваем длину
}

// --- ПРОВЕРКА reCAPTCHA v3 ---
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification');
    return { success: true, score: 1 }; // Пропускаем если ключ не настроен
  }
  
  if (!token) {
    return { success: false, score: 0, error: 'No token provided' };
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });
    
    const data = await response.json();
    return {
      success: data.success,
      score: data.score || 0,
      action: data.action,
      error: data['error-codes']
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, score: 0, error: error.message };
  }
}

// --- ОСНОВНОЙ HANDLER ---
export default async function handler(req, res) {
  // CORS для OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 1. RATE LIMITING ---
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ 
        error: 'Слишком много запросов. Подожди минуту и попробуй снова.' 
      });
    }

    const { name, surname, email, phone, telegram, website, recaptchaToken } = req.body;

    // --- 2. HONEYPOT ---
    if (website && website.length > 0) {
      console.log('Bot detected via honeypot');
      return res.status(200).json({ success: true }); // Обманываем бота
    }

    // --- 3. reCAPTCHA v3 ПРОВЕРКА (опциональная) ---
    // Если reCAPTCHA заблокирована AdBlock - пропускаем, но логируем
    let recaptchaResult = { success: true, score: 'N/A (skipped)' };
    
    if (recaptchaToken) {
      recaptchaResult = await verifyRecaptcha(recaptchaToken);
      
      // Если reCAPTCHA вернула ошибку - логируем, но НЕ блокируем
      // (у пользователя может быть AdBlock)
      if (!recaptchaResult.success) {
        console.log('reCAPTCHA verification failed (AdBlock?):', recaptchaResult.error);
        recaptchaResult.score = 'FAILED';
      } else if (recaptchaResult.score < 0.3) {
        // Блокируем только явных ботов (score < 0.3)
        console.log(`Very low reCAPTCHA score: ${recaptchaResult.score} for IP: ${ip}`);
        return res.status(400).json({ error: 'Подозрительная активность. Попробуй ещё раз.' });
      }
    } else {
      console.log('No reCAPTCHA token (AdBlock blocking Google scripts?)');
      recaptchaResult.score = 'NO_TOKEN';
    }

    // --- 4. ВАЛИДАЦИЯ ПОЛЕЙ ---
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Заполни все обязательные поля' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Введи корректный email' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Введи корректный номер телефона' });
    }

    // --- 5. САНИТИЗАЦИЯ ---
    const cleanData = {
      name: sanitize(name),
      surname: sanitize(surname),
      email: sanitize(email),
      phone: sanitize(phone),
      telegram: sanitize(telegram)
    };

    // Получаем переменные окружения
    const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;

    // --- 6. СООБЩЕНИЕ ДЛЯ TELEGRAM ---
    const messageText = `
🚀 <b>Новая регистрация на Краш-тест!</b>

👤 <b>Имя:</b> ${cleanData.name} ${cleanData.surname}
📧 <b>Email:</b> ${cleanData.email}
📱 <b>Телефон:</b> ${cleanData.phone}
✈️ <b>Telegram:</b> ${cleanData.telegram || 'Не указан'}

🔒 <b>reCAPTCHA Score:</b> ${recaptchaResult.score}
🌐 <b>IP:</b> ${ip}
`;

    // --- 7. ОТПРАВКА ДАННЫХ ---
    const tasks = [];

    // Telegram
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
    }

    // Google Sheets
    if (GOOGLE_SHEET_URL) {
      tasks.push(
        fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...cleanData,
            recaptchaScore: recaptchaResult.score,
            ip: ip,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error('Google Sheets Error:', err))
      );
    }

    await Promise.all(tasks);

    // --- 8. УСПЕХ ---
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Ошибка сервера. Попробуй позже.' });
  }
}