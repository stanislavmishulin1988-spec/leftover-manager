const fs = require('fs')
const path = require('path')

// Скрипт для резервного копирования базы данных
// Запускается через: npm run db:backup

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
const backupDir = path.join(__dirname, '..', 'backups')

// Создание директории для бэкапов
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
  console.log('📁 Создана директория для резервных копий:', backupDir)
}

// Имя файла с датой
const now = new Date()
const timestamp = now.toISOString()
  .replace(/[:.]/g, '-')
  .split('T')[0] + '_' +
  now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')

const backupFilename = `backup_${timestamp}.db`
const backupPath = path.join(backupDir, backupFilename)

// Проверка существования базы данных
if (!fs.existsSync(dbPath)) {
  console.error('❌ Файл базы данных не найден:', dbPath)
  console.error('Сначала выполните: npm run db:push')
  process.exit(1)
}

// Копирование файла
fs.copyFileSync(dbPath, backupPath)

console.log('✅ Резервная копия создана:', backupFilename)
console.log('📂 Путь:', backupPath)

// Очистка старых бэкапов (оставляем последние 10)
const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db'))
  .sort()
  .reverse()

if (files.length > 10) {
  files.slice(10).forEach(file => {
    fs.unlinkSync(path.join(backupDir, file))
    console.log('🗑️ Удален старый бэкап:', file)
  })
}
