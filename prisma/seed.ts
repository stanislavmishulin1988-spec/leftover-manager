import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начальное заполнение базы данных...')

  // Хеширование паролей
  const adminPassword = await bcrypt.hash('admin123', 10)
  const operatorPassword = await bcrypt.hash('oper123', 10)
  const masterPassword = await bcrypt.hash('mast123', 10)

  // Создание пользователей
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Администратор',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      name: 'Оператор',
      username: 'operator',
      password: operatorPassword,
      role: 'OPERATOR',
    },
  })

  const master = await prisma.user.upsert({
    where: { username: 'master' },
    update: {},
    create: {
      name: 'Мастер',
      username: 'master',
      password: masterPassword,
      role: 'MASTER',
    },
  })

  console.log('✅ Пользователи созданы:')
  console.log('   - admin / admin123 (Администратор)')
  console.log('   - operator / oper123 (Оператор)')
  console.log('   - master / mast123 (Мастер)')

  // Создание тестовых остатков
  const testLeftovers = [
    {
      qrId: 'OST-2026-000001',
      orderNumber: '2458',
      materialType: 'ЛДСП',
      materialName: 'Egger U708',
      color: 'Светло-серый',
      thickness: 16,
      length: 1200,
      width: 450,
      quantity: 1,
      qrCreatedAt: new Date('2026-05-10'),
      addedBy: admin.id,
      comment: 'Остаток после распила кухни',
    },
    {
      qrId: 'OST-2026-000002',
      orderNumber: '2459',
      materialType: 'ЛДСП',
      materialName: 'Egger W1000',
      color: 'Белый',
      thickness: 16,
      length: 800,
      width: 600,
      quantity: 2,
      qrCreatedAt: new Date('2026-05-11'),
      addedBy: operator.id,
      comment: 'Два одинаковых остатка',
    },
    {
      qrId: 'OST-2026-000003',
      orderNumber: '2460',
      materialType: 'МДФ',
      materialName: 'МДФ эмаль',
      color: 'Бежевый',
      thickness: 22,
      length: 1500,
      width: 400,
      quantity: 1,
      qrCreatedAt: new Date('2026-05-12'),
      addedBy: master.id,
      comment: 'Фасадный материал',
    },
  ]

  for (const leftover of testLeftovers) {
    const savedLeftover = await prisma.leftover.upsert({
      where: { qrId: leftover.qrId },
      update: {},
      create: leftover,
    })

    // Запись в историю
    await prisma.history.create({
      data: {
        leftoverId: savedLeftover.id,
        actionType: 'ADD',
        userId: leftover.addedBy,
        comment: 'Тестовая запись при начальном заполнении',
      },
    })
  }

  console.log('✅ Тестовые остатки созданы')
  console.log('🎉 Начальное заполнение завершено!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
