import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Не указано имя файла' }, { status: 400 })
    }

    const backupPath = path.join(process.cwd(), 'backups', filename)

    try {
      const fileBuffer = await fs.readFile(backupPath)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Download backup error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки файла' },
      { status: 500 }
    )
  }
}
