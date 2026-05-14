import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors }, { status: 400 })
    }

    const data = validated.data
    const username = data.username.trim()

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином уже существует' },
        { status: 409 }
      )
    }

    const fullName = [data.lastName, data.firstName, data.middleName]
      .map(value => value?.trim())
      .filter(Boolean)
      .join(' ')

    const user = await prisma.user.create({
      data: {
        name: fullName,
        username,
        password: await hashPassword(data.password),
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
