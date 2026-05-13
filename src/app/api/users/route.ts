import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { userSchema } from '@/lib/validators'

// GET - получение списка пользователей (только ADMIN)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// POST - создание нового пользователя (только ADMIN)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const body = await request.json()
    const validated = userSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors },
        { status: 400 }
      )
    }

    const data = validated.data

    // Проверка на существующего пользователя
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином уже существует' },
        { status: 409 }
      )
    }

    const { hashPassword } = await import('@/lib/auth')
    const passwordHash = await hashPassword(data.password)

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
