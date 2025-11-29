# 📋 ЧИТ-ЛИСТ - БЫСТРАЯ СПРАВКА

Держите эту страницу под рукой во время деплоя!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🔑 ВАЖНЫЕ ДАННЫЕ

```
TELEGRAM_BOT_TOKEN:  8342620375:AAE3Mg5I--7qgxS9RoDgNlJWQ132bAc-G8A
TELEGRAM_CHAT_ID:    166456217
BOT_USERNAME:        kronon_matafon_bot
```

⚠️ ХРАНИТЬ В VERCEL ENVIRONMENT VARIABLES!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚀 3 ШАГА ДО ЗАПУСКА

### 1️⃣ GitHub (2 мин)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/marina-marathon.git
git push -u origin main
```

### 2️⃣ Vercel (3 мин)
1. vercel.com → Add New → Project
2. Import marina-marathon
3. Environment Variables:
   - TELEGRAM_BOT_TOKEN = [ваш токен]
   - TELEGRAM_CHAT_ID = [ваш ID]
4. Deploy

### 3️⃣ Тест (1 мин)
1. Откройте сайт
2. Заполните форму
3. Проверьте Telegram

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📁 СТРУКТУРА ФАЙЛОВ

```
marina-marathon/
├── index.html              # Фронтенд (БЕЗ токена)
├── api/submit-form.js      # Backend (С токеном из ENV)
├── vercel.json             # Конфигурация
├── .env.example            # Шаблон переменных
├── .gitignore              # Защита Git
└── README.md               # Полная инструкция
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ✅ ЧЕК-ЛИСТ ПЕРЕД ДЕПЛОЕМ

- [ ] Git установлен
- [ ] Аккаунт на GitHub
- [ ] Аккаунт на Vercel
- [ ] Telegram бот создан
- [ ] Знаю CHAT_ID
- [ ] Написал боту Start

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🐛 БЫСТРЫЕ РЕШЕНИЯ ПРОБЛЕМ

### Форма не отправляется
→ F12 → Console → что за ошибка?
→ Vercel Functions → логи

### Сообщение не приходит
→ Переменные окружения в Vercel?
→ Нажали Start у бота?
→ Правильный CHAT_ID?

### "Конфигурация сервера не завершена"
→ Добавьте Environment Variables в Vercel
→ Redeploy проект

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🔍 ГДЕ ИСКАТЬ ИНФОРМАЦИЮ

| Вопрос | Документ |
|--------|----------|
| Как деплоить? | README.md |
| Быстрый старт? | QUICK_START.md |
| Как работает? | ARCHITECTURE.md |
| Проблемы? | FAQ.md |
| Git команды? | GIT_COMMANDS.md |
| Пошаговая проверка? | CHECKLIST.md |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🔐 БЕЗОПАСНОСТЬ

### ✅ ПРАВИЛЬНО:
```javascript
// api/submit-form.js (на сервере)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
```

### ❌ НЕПРАВИЛЬНО:
```javascript
// index.html (в браузере)
const TOKEN = "8342620375:AAE..."; // ЛЮБОЙ УВИДИТ!
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 💻 ПОЛЕЗНЫЕ КОМАНДЫ

### Git
```bash
git status              # Статус
git add .               # Добавить всё
git commit -m "msg"     # Коммит
git push                # Отправить
```

### Проверка
```bash
git --version           # Версия Git
node --version          # Версия Node
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📞 ВАЖНЫЕ ССЫЛКИ

- GitHub: https://github.com
- Vercel: https://vercel.com
- Vercel Docs: https://docs.vercel.com
- @BotFather: https://t.me/BotFather
- @userinfobot: https://t.me/userinfobot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 ПОСЛЕ ДЕПЛОЯ

1. Протестировать форму
2. Проверить Telegram
3. Проверить мобильную версию
4. Добавить в закладки Vercel Dashboard
5. Настроить домен (опционально)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📊 ПОТОК ДАННЫХ

```
Пользователь → index.html → /api/submit-form → Telegram → ВЫ
  (форма)     (фронтенд)     (backend+токен)   (API)   (уведомление)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⏰ ТАЙМЛАЙН

00:00 - Скачать проект
00:02 - Прочитать QUICK_START.md
00:05 - Загрузить на GitHub
00:10 - Деплой на Vercel
00:15 - Тестирование
00:20 - ✅ ГОТОВО!

Всего: ~20 минут от начала до готового сайта!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Удачи! Всё получится! 🚀

Версия: 1.0.0 | 29.11.2025 | Marina Marathon Project
