// api/register.js
// С reCAPTCHA v3 (опциональной), Rate Limiting, генерацией ID для Deep Link

// --- ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID ---
function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// --- ПРОСТОЙ IN-MEMORY RATE LIMITER ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 минута
const RATE_LIMIT_MAX = 5; // Максимум 5 запросов в минуту с одного IP

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
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
  
  return true;
}

// --- ВАЛИДАЦИЯ ---
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6;
}

// --- САНИТИЗАЦИЯ ---
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
    .slice(0, 500);
}

// --- ПРОВЕРКА reCAPTCHA v3 ---
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey || !token) {
    return { success: true, score: 'N/A' };
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
      error: data['error-codes']
    };
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return { success: true, score: 'ERROR' };
  }
}

// --- ОСНОВНОЙ HANDLER ---
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 1. RATE LIMITING ---
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ 
        error: 'Слишком много запросов. Подожди минуту.' 
      });
    }

    const { name, surname, email, phone, website, recaptchaToken } = req.body;

    // --- 2. HONEYPOT ---
    if (website && website.length > 0) {
      console.log('Bot detected via honeypot');
      return res.status(200).json({ success: true, redirectUrl: '#' });
    }

    // --- 3. reCAPTCHA (опциональная) ---
    let recaptchaScore = 'N/A';
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      recaptchaScore = recaptchaResult.score;
      
      if (recaptchaResult.success && recaptchaResult.score < 0.3) {
        return res.status(400).json({ error: 'Подозрительная активность.' });
      }
    }

    // --- 4. ВАЛИДАЦИЯ ---
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Заполни все обязательные поля' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Введи корректный email' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Введи корректный номер телефона' });
    }

    // --- 5. ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID ---
    const uniqueId = generateId();

    // --- 6. САНИТИЗАЦИЯ ---
    const cleanData = {
      name: sanitize(name),
      surname: sanitize(surname),
      email: sanitize(email),
      phone: sanitize(phone),
      id: uniqueId
    };

    // Переменные окружения
    const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;
    const BOT_USERNAME = process.env.BOT_USERNAME || 'kronon_matafon_bot';

    // --- 7. СООБЩЕНИЕ ДЛЯ МАРИНЫ (уведомление о регистрации) ---
    const messageText = `
🚀 <b>Новая регистрация на Краш-тест!</b>

👤 <b>Имя:</b> ${cleanData.name} ${cleanData.surname}
📧 <b>Email:</b> ${cleanData.email}
📱 <b>Телефон:</b> ${cleanData.phone}
🔑 <b>ID:</b> ${uniqueId}

🔒 <b>reCAPTCHA:</b> ${recaptchaScore}
🌐 <b>IP:</b> ${ip}

⏳ Ожидаем подтверждение через бота...
`;

    // --- 8. ОТПРАВКА ДАННЫХ ---
    const tasks = [];

    // Telegram (уведомление Марине)
    if (TG_BOT_TOKEN && TG_CHAT_ID) {
      tasks.push(
        fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TG_CHAT_ID,
            text: messageText,
            parse_mode: 'HTML'
          })
        }).catch(err => console.error('Telegram Error:', err))
      );
    }

    // Google Sheets
    if (GOOGLE_SHEET_URL) {
      tasks.push(
        fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanData)
        }).catch(err => console.error('Google Sheets Error:', err))
      );
    }

    await Promise.all(tasks);

    // --- 9. ВОЗВРАЩАЕМ URL ДЛЯ РЕДИРЕКТА С DEEP LINK ---
    const redirectUrl = `https://t.me/${BOT_USERNAME}?start=${uniqueId}`;

    return res.status(200).json({ 
      success: true,
      redirectUrl: redirectUrl
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Ошибка сервера. Попробуй позже.' });
  }
}