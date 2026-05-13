# 🚀 Развёртывание в облаке

Эта инструкция поможет вам развернуть приложение на Vercel с базой данных Neon PostgreSQL.
После развёртывания вы сможете работать из любой точки мира с любого устройства.

---

## 📋 Что понадобится

1. Аккаунт на GitHub
2. Аккаунт на Vercel (можно войти через GitHub)
3. Аккаунт на Neon (можно войти через GitHub)

---

## Шаг 1: Создать базу данных на Neon

1. Откройте https://neon.tech
2. Нажмите **Sign Up** → войдите через GitHub
3. Нажмите **Create a project**
4. Введите название: `leftover-manager`
5. Выберите регион: **AWS Frankfurt (eu-central-1)** (ближе к Европе)
6. Нажмите **Create project**

7. После создания скопируйте **Connection string**:
   - Нажмите на название базы данных
   - Прокрутите вниз до **Connection details**
   - Скопируйте строку вида:
     ```
     postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
     ```

---

## Шаг 2: Загрузить код на GitHub

1. Создайте новый репозиторий на https://github.com/new
2. Назовите его: `leftover-manager`
3. Сделайте репозиторий **Private** (если хотите)
4. В папке проекта выполните:

```bash
cd "C:\Users\Стас\Desktop\Приложение для остатков"

# Инициализация Git
git init
git add .
git commit -m "Initial commit"

# Добавьте ваш репозиторий (замените YOUR_USERNAME на ваш логин GitHub)
git remote add origin https://github.com/YOUR_USERNAME/leftover-manager.git
git branch -M main
git push -u origin main
```

---

## Шаг 3: Развернуть на Vercel

1. Откройте https://vercel.com/new
2. Войдите через GitHub
3. Найдите ваш репозиторий `leftover-manager`
4. Нажмите **Import**

5. **Настройте переменные окружения:**
   - Нажмите **Environment Variables**
   - Добавьте переменную `DATABASE_URL`
   - Вставьте connection string из Neon
   - Добавьте переменную `JWT_SECRET`
   - Введите любую случайную строку (например: `my-super-secret-key-12345`)

6. Нажмите **Deploy**

---

## Шаг 4: Создать таблицы в базе данных

После первого развёртывания нужно создать таблицы:

1. Откройте **Vercel Dashboard** → ваш проект
2. Перейдите на вкладку **Settings** → **Environment Variables**
3. Убедитесь, что `DATABASE_URL` установлен

4. Откройте **Vercel CLI** на компьютере:
```bash
# Установите Vercel CLI если нет
npm install -g vercel

# Войдите
vercel login

# Привяжите проект
vercel link

# Запустите миграцию
vercel env pull
npx prisma db push --schema ./prisma/schema.postgres.prisma
```

Или выполните миграцию через **Vercel Dashboard**:
1. Перейдите на вкладку **Functions**
2. Создайте новую функцию для миграции (см. ниже)

---

## Шаг 5: Добавить пользователей

После создания таблиц добавьте первого пользователя через SQL:

1. В Neon Dashboard откройте **SQL Editor**
2. Выполните запрос (замените хеш пароля):

```sql
-- Пароль: admin123 (хеш bcrypt)
INSERT INTO users (id, name, username, password, role, "createdAt", "updatedAt")
VALUES (
  'admin-001',
  'Администратор',
  'admin',
  '$2a$10$rMx9YQYxQYxQYxQYxQYxQOqWxQYxQYxQYxQYxQYxQYxQYxQYxQYxQ',
  'ADMIN',
  NOW(),
  NOW()
);
```

**Важно:** Нужно сгенерировать правильный хеш пароля. Выполните локально:

```bash
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

Скопируйте результат и вставьте в SQL запрос.

---

## 🎉 Готово!

Ваше приложение доступно по адресу:
```
https://leftover-manager-YOUR_USERNAME.vercel.app
```

### Вход в систему:
- **Логин:** admin
- **Пароль:** admin123 (или тот, который вы задали)

---

## 📱 Мобильное сканирование

Теперь мобильное сканирование будет работать с HTTPS:

1. Откройте на телефоне: `https://leftover-manager-YOUR_USERNAME.vercel.app/mobile`
2. Войдите в систему
3. Разрешите доступ к камере
4. Сканируйте QR-коды

---

## 🔧 Дополнительные настройки

### Свой домен

1. Vercel Dashboard → **Settings** → **Domains**
2. Добавьте ваш домен
3. Настройте DNS записи

### Автоматическое обновление

При каждом push в ветку `main` приложение будет обновляться автоматически.

### Резервное копирование

Neon автоматически создаёт бэкапы. Вы можете:
1. Открыть Neon Dashboard
2. Перейти на вкладку **Backups**
3. Восстановить из любой точки во времени

---

## 💰 Стоимость

| Сервис | Бесплатный тариф | Платный |
|--------|------------------|---------|
| Vercel | 100 GB трафика/мес | $20/мес |
| Neon | 0.5 GB данных | $19/мес |

Для небольшого производства бесплатных тарифов хватит на несколько месяцев.

---

## 🆘 Если что-то не работает

### Ошибка подключения к базе
- Проверьте, что `DATABASE_URL` установлен в Vercel
- Убедитесь, что в строке подключения есть `?sslmode=require`

### Ошибка авторизации
- Проверьте, что `JWT_SECRET` установлен
- Перезалогиньтесь в приложении

### Мобильная камера не работает
- Убедитесь, что используете **HTTPS** (не HTTP)
- Разрешите доступ к камере в настройках браузера

---

## 📞 Поддержка

Если возникнут вопросы:
1. Проверьте логи в Vercel Dashboard → **Deployments** → **View logs**
2. Проверьте базу в Neon Dashboard → **SQL Editor**
