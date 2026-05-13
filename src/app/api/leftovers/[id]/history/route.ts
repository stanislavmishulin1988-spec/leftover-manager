import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - получение истории конкретного остатка
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const history = await prisma.history.findMany({
      where: { leftoverId: params.id },
      include: {
        user: {
          select: { id: true, name: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Get history error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
