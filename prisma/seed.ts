import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Начальное заполнение базы данных...')

  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Администратор',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log('Пользователь администратора создан: admin / admin123')
  console.log('Начальное заполнение завершено.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
