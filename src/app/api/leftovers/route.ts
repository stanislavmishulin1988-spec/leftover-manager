import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { qrDataSchema, filtersSchema } from '@/lib/validators'
import { Prisma } from '@prisma/client'
import { parseUniversalQR } from '@/lib/qr'

async function generateNextQrId() {
  let nextNumber = await prisma.leftover.count()

  while (true) {
    nextNumber += 1
    const qrId = `OST-${String(nextNumber).padStart(6, '0')}`
    const existing = await prisma.leftover.findUnique({ where: { qrId } })

    if (!existing) return qrId
  }
}

function normalizedText(value?: string) {
  return value?.trim() || ''
}

function roundedQuantity(value?: number) {
  return value ? Math.round(value) : 0
}

function buildDuplicateWhere(data: {
  orderNumber?: string
  materialType?: string
  materialName?: string
  thickness?: number
  length?: number
  width?: number
  quantity?: number
}): Prisma.LeftoverWhereInput {
  return {
    orderNumber: normalizedText(data.orderNumber),
    materialType: normalizedText(data.materialType),
    materialName: normalizedText(data.materialName),
    thickness: data.thickness ?? 0,
    length: data.length ?? 0,
    width: data.width ?? 0,
    quantity: roundedQuantity(data.quantity),
  }
}

function buildQrSearchWhere(rawSearch: string): Prisma.LeftoverWhereInput | null {
  const qrData = parseUniversalQR(rawSearch)
  const fields: Prisma.LeftoverWhereInput[] = []

  if (qrData.orderNumber) fields.push({ orderNumber: normalizedText(qrData.orderNumber) })
  if (qrData.materialType) fields.push({ materialType: normalizedText(qrData.materialType) })
  if (qrData.materialName) fields.push({ materialName: normalizedText(qrData.materialName) })
  if (qrData.thickness !== undefined) fields.push({ thickness: qrData.thickness })
  if (qrData.length !== undefined) fields.push({ length: qrData.length })
  if (qrData.width !== undefined) fields.push({ width: qrData.width })
  if (qrData.quantity !== undefined) fields.push({ quantity: roundedQuantity(qrData.quantity) })

  return fields.length >= 2 ? { AND: fields } : null
}

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
      const qrSearchWhere = buildQrSearchWhere(f.search)
      where.OR = [
        { qrId: { contains: f.search } },
        { orderNumber: { contains: f.search } },
        { materialName: { contains: f.search } },
      ]

      if (qrSearchWhere) {
        where.OR.push(qrSearchWhere)
      }
    }

    // Фильтры
    if (f.materialType) where.materialType = f.materialType
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
    const qrId = await generateNextQrId()
    const qrCreatedAt = data.createdAt ? new Date(data.createdAt) : new Date()
    const duplicateWhere = buildDuplicateWhere(data)

    const existingLeftover = await prisma.leftover.findFirst({
      where: duplicateWhere,
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
      },
    })

    if (existingLeftover) {
      return NextResponse.json(
        {
          error: 'duplicate',
          message: 'Остаток с такими же параметрами уже есть в базе',
          leftover: existingLeftover,
        },
        { status: 409 }
      )
    }

    // Создание остатка
    const leftover = await prisma.leftover.create({
      data: {
        qrId,
        orderNumber: normalizedText(data.orderNumber),
        materialType: normalizedText(data.materialType),
        materialName: normalizedText(data.materialName),
        color: '',
        thickness: data.thickness ?? 0,
        length: data.length ?? 0,
        width: data.width ?? 0,
        quantity: roundedQuantity(data.quantity),
        qrCreatedAt: Number.isNaN(qrCreatedAt.getTime()) ? new Date() : qrCreatedAt,
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
