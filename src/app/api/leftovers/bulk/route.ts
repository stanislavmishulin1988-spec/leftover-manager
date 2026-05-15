import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { bulkLeftoverSchema } from '@/lib/validators'

const validStatuses = ['AVAILABLE', 'RESERVED', 'USED', 'SCRAPPED', 'DELETED']

const isEdgeMaterial = (materialType?: string) => materialType?.trim().toLowerCase() === 'кромка'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const validated = bulkLeftoverSchema.safeParse(await request.json())
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors }, { status: 400 })
    }

    const data = validated.data
    const leftovers = await prisma.leftover.findMany({
      where: { id: { in: data.ids } },
    })

    if (leftovers.length === 0) {
      return NextResponse.json({ error: 'Остатки не найдены' }, { status: 404 })
    }

    if (data.action === 'status') {
      if (!data.status || !validStatuses.includes(data.status)) {
        return NextResponse.json({ error: 'Укажите корректный статус' }, { status: 400 })
      }

      await prisma.$transaction(
        leftovers.flatMap(leftover => [
          prisma.leftover.update({
            where: { id: leftover.id },
            data: {
              status: data.status,
              ...(data.status === 'DELETED' ? { deletedAt: new Date(), deletedBy: user.id } : {}),
            },
          }),
          prisma.history.create({
            data: {
              leftoverId: leftover.id,
              actionType: 'UPDATE_STATUS',
              oldValue: leftover.status,
              newValue: data.status,
              userId: user.id,
              comment: data.comment || 'Массовое изменение статуса',
            },
          }),
        ])
      )
    }

    if (data.action === 'delete') {
      await prisma.$transaction(
        leftovers.flatMap(leftover => [
          prisma.leftover.update({
            where: { id: leftover.id },
            data: {
              status: 'DELETED',
              deletedAt: new Date(),
              deletedBy: user.id,
            },
          }),
          prisma.history.create({
            data: {
              leftoverId: leftover.id,
              actionType: 'DELETE',
              userId: user.id,
              comment: data.comment || 'Массовое удаление',
            },
          }),
        ])
      )
    }

    if (data.action === 'update') {
      const hasChanges = [
        data.orderNumber,
        data.materialType,
        data.materialName,
        data.thickness,
        data.length,
        data.width,
        data.quantity,
        data.comment,
      ].some(value => value !== undefined && value !== '')

      if (!hasChanges) {
        return NextResponse.json({ error: 'Нет данных для изменения' }, { status: 400 })
      }

      await prisma.$transaction(
        leftovers.flatMap(leftover => {
          const nextMaterialType = data.materialType?.trim() || leftover.materialType
          return [
            prisma.leftover.update({
              where: { id: leftover.id },
              data: {
                ...(data.orderNumber ? { orderNumber: data.orderNumber.trim() } : {}),
                ...(data.materialType ? { materialType: data.materialType.trim() } : {}),
                ...(data.materialName ? { materialName: data.materialName.trim() } : {}),
                ...(data.thickness !== undefined ? { thickness: data.thickness } : {}),
                ...(data.length !== undefined ? { length: data.length } : {}),
                ...(data.width !== undefined ? { width: data.width } : {}),
                ...(data.quantity !== undefined ? { quantity: isEdgeMaterial(nextMaterialType) ? 0 : Math.round(data.quantity) } : {}),
                ...(data.comment ? { comment: data.comment.trim() } : {}),
              },
            }),
            prisma.history.create({
              data: {
                leftoverId: leftover.id,
                actionType: 'UPDATE',
                userId: user.id,
                comment: 'Массовое редактирование',
              },
            }),
          ]
        })
      )
    }

    return NextResponse.json({ success: true, updated: leftovers.length })
  } catch (error) {
    console.error('Bulk leftovers error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
