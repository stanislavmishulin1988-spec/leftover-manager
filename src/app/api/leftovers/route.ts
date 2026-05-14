import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { qrDataSchema, filtersSchema } from '@/lib/validators'
import { Prisma } from '@prisma/client'

// GET - получение списка остатков с фильтрами
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = filtersSchema.safeParse(Object.fromEntries(searchParams))

    if (!filters.success) {
      return NextResponse.json({ error: filters.error.errors }, { status: 400 })
    }

    const f = filters.data
    const where: Prisma.LeftoverWhereInput = {}

    // Поиск по тексту
    if (f.search) {
      where.OR = [
        { qrId: { contains: f.search } },
        { orderNumber: { contains: f.search } },
        { materialName: { contains: f.search } },
        { color: { contains: f.search } },
      ]
    }

    // Фильтры
    if (f.materialType) where.materialType = f.materialType
    if (f.color) where.color = f.color
    if (f.thickness) where.thickness = f.thickness
    if (f.status) where.status = f.status as 'AVAILABLE' | 'RESERVED' | 'USED' | 'SCRAPPED' | 'DELETED'
    if (f.lengthMin || f.lengthMax) {
      where.length = {}
      if (f.lengthMin) where.length.gte = f.lengthMin
      if (f.lengthMax) where.length.lte = f.lengthMax
    }
    if (f.widthMin || f.widthMax) {
      where.width = {}
      if (f.widthMin) where.width.gte = f.widthMin
      if (f.widthMax) where.width.lte = f.widthMax
    }
    if (f.dateFrom || f.dateTo) {
      where.addedAt = {}
      if (f.dateFrom) where.addedAt.gte = new Date(f.dateFrom)
      if (f.dateTo) where.addedAt.lte = new Date(f.dateTo)
    }

    // Показывать удаленные
    if (!f.showDeleted) {
      where.deletedAt = null
    }

    const leftovers = await prisma.leftover.findMany({
      where,
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
        reservedByUser: { select: { id: true, name: true, username: true, role: true } },
        deletedByUser: { select: { id: true, name: true, username: true, role: true } },
      },
      orderBy: { addedAt: 'desc' },
    })

    return NextResponse.json({ leftovers })
  } catch (error) {
    console.error('Get leftovers error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// POST - добавление нового остатка
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const validated = qrDataSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors },
        { status: 400 }
      )
    }

    const data = validated.data

    // Проверка на дубль
    const existing = await prisma.leftover.findUnique({
      where: { qrId: data.id },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: 'duplicate',
          message: 'Этот QR-код уже есть в базе',
          leftover: existing,
        },
        { status: 409 }
      )
    }

    // Создание остатка
    const leftover = await prisma.leftover.create({
      data: {
        qrId: data.id,
        orderNumber: data.orderNumber,
        materialType: data.materialType,
        materialName: data.materialName,
        color: data.color,
        thickness: data.thickness,
        length: data.length,
        width: data.width,
        quantity: data.quantity,
        qrCreatedAt: new Date(data.createdAt),
        addedBy: user.id,
        comment: data.comment,
      },
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
      },
    })

    // Запись в историю
    await prisma.history.create({
      data: {
        leftoverId: leftover.id,
        actionType: 'ADD',
        userId: user.id,
        comment: 'Остаток добавлен через сканирование QR-кода',
      },
    })

    return NextResponse.json({ success: true, leftover })
  } catch (error) {
    console.error('Create leftover error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
