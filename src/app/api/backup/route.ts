import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Путь к базе данных SQLite
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    const backupDir = path.join(process.cwd(), 'backups')

    // Создание директории для бэкапов
    await fs.mkdir(backupDir, { recursive: true })

    // Имя файла с датой
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                      new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    const backupFilename = `backup_${timestamp}.db`
    const backupPath = path.join(backupDir, backupFilename)

    // Копирование файла базы данных
    await fs.copyFile(dbPath, backupPath)

    return NextResponse.json({
      success: true,
      filename: backupFilename,
      path: backupPath,
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания резервной копии' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const backupDir = path.join(process.cwd(), 'backups')

    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = files
        .filter(f => f.endsWith('.db'))
        .map(f => ({
          filename: f,
          createdAt: new Date(
            path.join(backupDir, f)
          ).toISOString(),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      return NextResponse.json({ backups: backupFiles })
    } catch {
      return NextResponse.json({ backups: [] })
    }
  } catch (error) {
    console.error('Get backups error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения списка бэкапов' },
      { status: 500 }
    )
  }
}
