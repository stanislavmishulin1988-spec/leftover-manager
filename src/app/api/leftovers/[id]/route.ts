import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { statusChangeSchema } from '@/lib/validators'

// GET - получение конкретного остатка
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const leftover = await prisma.leftover.findUnique({
      where: { id: params.id },
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
        reservedByUser: { select: { id: true, name: true, username: true, role: true } },
        deletedByUser: { select: { id: true, name: true, username: true, role: true } },
        history: {
          include: {
            user: { select: { id: true, name: true, username: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!leftover) {
      return NextResponse.json({ error: 'Остаток не найден' }, { status: 404 })
    }

    return NextResponse.json({ leftover })
  } catch (error) {
    console.error('Get leftover error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// PUT - обновление остатка (статус, комментарий)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const validated = statusChangeSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors },
        { status: 400 }
      )
    }

    const { status, comment, orderNumber } = validated.data

    const leftover = await prisma.leftover.findUnique({
      where: { id: params.id },
    })

    if (!leftover) {
      return NextResponse.json({ error: 'Остаток не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const historyEntries: Array<{
      leftoverId: string
      actionType: string
      oldValue?: string
      newValue?: string
      userId: string
      comment?: string
    }> = []

    // Изменение статуса
    if (status && status !== leftover.status) {
      updateData.status = status
      historyEntries.push({
        leftoverId: params.id,
        actionType: 'UPDATE_STATUS',
        oldValue: leftover.status,
        newValue: status,
        userId: user.id,
        comment: comment || `Статус изменен с ${leftover.status} на ${status}`,
      })
    }

    // Резервирование
    if (status === 'RESERVED' && orderNumber) {
      updateData.reservedForOrder = orderNumber
      updateData.reservedBy = user.id
      updateData.reservedAt = new Date()
      historyEntries.push({
        leftoverId: params.id,
        actionType: 'RESERVE',
        newValue: orderNumber,
        userId: user.id,
        comment: `Зарезервирован под заказ ${orderNumber}`,
      })
    }

    // Использование
    if (status === 'USED' && orderNumber) {
      updateData.usedForOrder = orderNumber
      updateData.usedBy = user.id
      updateData.usedAt = new Date()
      historyEntries.push({
        leftoverId: params.id,
        actionType: 'USE',
        newValue: orderNumber,
        userId: user.id,
        comment: `Использован в заказе ${orderNumber}`,
      })
    }

    // Удаление (мягкое)
    if (status === 'DELETED') {
      updateData.deletedAt = new Date()
      updateData.deletedBy = user.id
      historyEntries.push({
        leftoverId: params.id,
        actionType: 'DELETE',
        userId: user.id,
        comment: comment || 'Остаток удален',
      })
    }

    // Обновление комментария
    if (comment && !historyEntries.length) {
      updateData.comment = comment
      historyEntries.push({
        leftoverId: params.id,
        actionType: 'UPDATE',
        oldValue: leftover.comment || '',
        newValue: comment,
        userId: user.id,
        comment: 'Комментарий обновлен',
      })
    }

    const updatedLeftover = await prisma.leftover.update({
      where: { id: params.id },
      data: updateData,
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
        reservedByUser: { select: { id: true, name: true, username: true, role: true } },
        deletedByUser: { select: { id: true, name: true, username: true, role: true } },
      },
    })

    // Запись в историю
    if (historyEntries.length > 0) {
      await prisma.history.createMany({
        data: historyEntries,
      })
    }

    return NextResponse.json({ success: true, leftover: updatedLeftover })
  } catch (error) {
    console.error('Update leftover error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// DELETE - мягкое удаление остатка
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const leftover = await prisma.leftover.findUnique({
      where: { id: params.id },
    })

    if (!leftover) {
      return NextResponse.json({ error: 'Остаток не найден' }, { status: 404 })
    }

    if (hardDelete) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
      }

      if (leftover.status !== 'DELETED' && !leftover.deletedAt) {
        return NextResponse.json(
          { error: 'Полностью удалить можно только уже удаленный остаток' },
          { status: 400 }
        )
      }

      await prisma.leftover.delete({
        where: { id: params.id },
      })

      return NextResponse.json({ success: true })
    }

    // Мягкое удаление - меняем статус на DELETED
    const updatedLeftover = await prisma.leftover.update({
      where: { id: params.id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: user.id,
      },
      include: {
        addedByUser: { select: { id: true, name: true, username: true, role: true } },
        deletedByUser: { select: { id: true, name: true, username: true, role: true } },
      },
    })

    // Запись в историю
    await prisma.history.create({
      data: {
        leftoverId: params.id,
        actionType: 'DELETE',
        userId: user.id,
        comment: 'Остаток удален',
      },
    })

    return NextResponse.json({ success: true, leftover: updatedLeftover })
  } catch (error) {
    console.error('Delete leftover error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
