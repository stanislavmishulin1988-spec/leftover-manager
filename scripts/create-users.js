// Скрипт для создания пользователей
// Запуск: node scripts/create-users.js

const bcrypt = require('bcryptjs')

function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

console.log('🔐 Хеш паролей для базы данных:\n')

const users = [
  { login: 'admin', password: 'admin123', role: 'ADMIN', name: 'Администратор' },
  { login: 'operator', password: 'oper123', role: 'OPERATOR', name: 'Оператор' },
  { login: 'master', password: 'mast123', role: 'MASTER', name: 'Мастер' },
]

users.forEach(user => {
  const hash = hashPassword(user.password)
  console.log(`-- ${user.name}`)
  console.log(`INSERT INTO users (id, name, username, password, role, "createdAt", "updatedAt")`)
  console.log(`VALUES (`)
  console.log(`  '${user.login}-001',`)
  console.log(`  '${user.name}',`)
  console.log(`  '${user.login}',`)
  console.log(`  '${hash}',`)
  console.log(`  '${user.role}',`)
  console.log(`  NOW(),`)
  console.log(`  NOW()`)
  console.log(`);\n`)
})

console.log('📋 Скопируйте SQL запросы выше и выполните в Neon SQL Editor')
