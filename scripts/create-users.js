// Скрипт для создания SQL администратора
// Запуск: node scripts/create-users.js

const bcrypt = require('bcryptjs')

const user = {
  login: 'admin',
  password: 'admin123',
  role: 'ADMIN',
  name: 'Администратор',
}

const hash = bcrypt.hashSync(user.password, 10)

console.log('-- Администратор по умолчанию')
console.log('INSERT INTO users (id, name, username, password, role, "createdAt", "updatedAt")')
console.log('VALUES (')
console.log(`  '${user.login}-001',`)
console.log(`  '${user.name}',`)
console.log(`  '${user.login}',`)
console.log(`  '${hash}',`)
console.log(`  '${user.role}',`)
console.log('  NOW(),')
console.log('  NOW()')
console.log(')')
console.log('ON CONFLICT (username) DO UPDATE SET')
console.log('  name = EXCLUDED.name,')
console.log('  password = EXCLUDED.password,')
console.log('  role = EXCLUDED.role,')
console.log('  "updatedAt" = NOW();')
