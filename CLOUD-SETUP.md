# ☁️ Пошаговая инструкция: Развёртывание в облаке

Эта инструкция поможет вам настроить облачную версию приложения, чтобы работать из любой точки мира.

---

## 📋 Что вы получите

- ✅ Доступ к базе данных из любой точки мира
- ✅ Работа с компьютера, телефона, планшета
- ✅ HTTPS для безопасной работы камеры
- ✅ Автоматические резервные копии
- ✅ Бесплатный тариф для начала

---

## 🚀 Быстрое развёртывание (30 минут)

### Шаг 1: Создать базу данных (5 мин)

1. Откройте https://neon.tech
2. Нажмите **Sign Up** → **Continue with GitHub**
3. После входа нажмите **New Project**
4. Введите название: `leftover-manager`
5. Регион: выберите **AWS Frankfurt (eu-central-1)** — ближе к Европе
6. Нажмите **Create project**

7. **Скопируйте Connection String:**
   - Прокрутите вниз до **Connection details**
   - Нажмите **Copy** рядом с строкой подключения
   - Сохраните в блокнот — понадобится позже

   Строка выглядит так:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

---

### Шаг 2: Загрузить проект на GitHub (5 мин)

1. Откройте https://github.com/new
2. Название репозитория: `leftover-manager`
3. Выберите **Private** (по желанию)
4. Нажмите **Create repository**

5. Откройте PowerShell в папке проекта:
   ```powershell
   cd "C:\Users\Стас\Desktop\Приложение для остатков"
   ```

6. Выполните команды по очереди:
   ```powershell
   # Инициализация Git
   git init
   
   # Добавить все файлы
   git add .
   
   # Сделать коммит
   git commit -m "Initial commit"
   
   # Переименовать ветку
   git branch -M main
   
   # Добавить удалённый репозиторий (замените YOUR_GITHUB_USERNAME)
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/leftover-manager.git
   
   # Отправить на GitHub
   git push -u origin main
   ```

---

### Шаг 3: Развернуть на Vercel (10 мин)

1. Откройте https://vercel.com/new
2. Нажмите **Continue with GitHub**
3. Найдите ваш репозиторий `leftover-manager`
4. Нажмите **Import**

5. **Настройте проект:**
   - **Framework Preset:** Next.js (должен определиться автоматически)
   - **Root Directory:** оставьте как есть
   - **Build Command:** `prisma generate --schema ./prisma/schema.postgres.prisma && next build`
   - **Output Directory:** оставьте как есть

6. **Добавьте переменные окружения:**
   
   Нажмите **Environment Variables** → **Add New**:
   
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Connection string из Neon (шаг 1) |
   | `JWT_SECRET` | Любая случайная строка, например: `my-secret-key-123456` |

7. Нажмите **Deploy**

8. Дождитесь завершения (2-3 минуты)

---

### Шаг 4: Создать таблицы в базе (5 мин)

1. Откройте **Vercel Dashboard** → ваш проект
2. Перейдите на вкладку **Settings** → **Build & Development Settings**
3. Убедитесь, что сборка прошла успешно

4. Откройте **PowerShell** в папке проекта:
   ```powershell
   cd "C:\Users\Стас\Desktop\Приложение для остатков"
   ```

5. Создайте файл `.env.local`:
   ```powershell
   notepad .env.local
   ```

6. Вставьте содержимое:
   ```
   DATABASE_URL=ваша_строка_подключения_из_Neon
   ```

7. Сохраните и закройте

8. Выполните миграцию:
   ```powershell
   npx prisma db push --schema ./prisma/schema.postgres.prisma
   ```

---

### Шаг 5: Создать пользователей (5 мин)

1. В PowerShell выполните:
   ```powershell
   node scripts/create-users.js
   ```

2. Скопируйте SQL-запросы из вывода

3. Откройте **Neon Dashboard** → ваш проект
4. Перейдите на вкладку **SQL Editor**
5. Вставьте SQL-запросы и нажмите **Run**

6. Проверьте, что пользователи созданы:
   ```sql
   SELECT username, name, role FROM users;
   ```

---

## 🎉 Готово!

### Ваш сайт доступен по адресу:
```
https://leftover-manager-YOUR_USERNAME.vercel.app
```

### Войти в систему:
| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin123 | Администратор |
| operator | oper123 | Оператор |
| master | mast123 | Мастер |

---

## 📱 Работа с телефона

### Мобильное сканирование (камера работает!):

1. Откройте на телефоне Safari/Chrome
2. Перейдите: `https://leftover-manager-YOUR_USERNAME.vercel.app/mobile`
3. Войдите в систему
4. Нажмите **Разрешить** доступ к камере
5. Сканируйте QR-коды

### Ручное добавление с телефона:

1. Откройте: `https://leftover-manager-YOUR_USERNAME.vercel.app/mobile`
2. Нажмите **"➕ Добавить вручную"**
3. Заполните форму
4. Нажмите **"Добавить"**

---

## 🔄 Обновление приложения

При каждом изменении кода:

```powershell
git add .
git commit -m "Описание изменений"
git push
```

Vercel автоматически обновит приложение через 1-2 минуты.

---

## 💰 Тарифы

### Бесплатно (хватит надолго):
- **Vercel:** 100 GB трафика/месяц
- **Neon:** 0.5 GB данных, 10 часов активности/день

### Когда расти:
- **Vercel Pro:** $20/мес (безлимитный трафик)
- **Neon Paid:** от $19/мес (больше данных)

---

## 🔧 Полезные команды

### Локальная разработка:
```powershell
npm run dev
```

### Создание миграций:
```powershell
npx prisma db push --schema ./prisma/schema.postgres.prisma
```

### Просмотр базы данных:
```powershell
npx prisma studio
```

### Логи Vercel:
```powershell
vercel logs
```

---

## 🆘 Решение проблем

### Ошибка: "Not authorized" на мобильном
- Убедитесь, что используете **HTTPS** (не HTTP)
- Выйдите и войдите заново

### Камера не работает в Safari
- Требуется iOS 11+
- Разрешите доступ в Настройки → Safari → Камера

### Ошибка подключения к базе
- Проверьте `DATABASE_URL` в Vercel Settings → Environment Variables
- Убедитесь, что строка содержит `?sslmode=require`

### Приложение не обновляется
- Откройте Vercel Dashboard → Deployments
- Нажмите на последний deployment → **Redeploy**

---

## 📞 Поддержка

### Логи приложения:
- Vercel Dashboard → **Deployments** → **View logs**

### Логи базы данных:
- Neon Dashboard → **SQL Editor**

### Тестирование API:
```bash
curl https://leftover-manager-YOUR_USERNAME.vercel.app/api/auth/me
```

---

## 🎯 Следующие шаги

1. **Добавьте свой домен** (по желанию):
   - Vercel Settings → Domains
   - Добавьте ваш домен

2. **Настройте уведомления**:
   - Vercel Settings → Notifications

3. **Защитите доступ**:
   - Vercel Settings → Deployment Protection

---

**Готово!** Теперь вы можете работать из офиса, дома и любой другой точки мира! 🌍
