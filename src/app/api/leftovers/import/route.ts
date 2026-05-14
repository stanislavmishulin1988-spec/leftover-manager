import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type ImportRow = Record<string, unknown>

const statusMap: Record<string, string> = {
  'в наличии': 'AVAILABLE',
  'зарезервирован': 'RESERVED',
  'использован': 'USED',
  'списан': 'SCRAPPED',
  'удален': 'DELETED',
  available: 'AVAILABLE',
  reserved: 'RESERVED',
  used: 'USED',
  scrapped: 'SCRAPPED',
  deleted: 'DELETED',
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = text(value).replace(',', '.').match(/\d+(?:\.\d+)?/)
  return parsed ? Number(parsed[0]) : 0
}

function intValue(value: unknown) {
  return Math.round(numberValue(value))
}

function isEdgeMaterial(materialType: string) {
  return materialType.trim().toLowerCase() === 'кромка'
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d)
  }

  const raw = text(value)
  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1]))

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function normalizeStatus(value: unknown) {
  const raw = text(value).toLowerCase()
  return statusMap[raw] || 'AVAILABLE'
}

async function generateNextQrId() {
  let nextNumber = await prisma.leftover.count()

  while (true) {
    nextNumber += 1
    const qrId = `OST-${String(nextNumber).padStart(6, '0')}`
    const existing = await prisma.leftover.findUnique({ where: { qrId } })

    if (!existing) return qrId
  }
}

function buildDuplicateWhere(row: {
  orderNumber: string
  materialType: string
  materialName: string
  thickness: number
  length: number
  width: number
  quantity: number
}): Prisma.LeftoverWhereInput {
  const where: Prisma.LeftoverWhereInput = {
    orderNumber: row.orderNumber,
    materialType: row.materialType,
    materialName: row.materialName,
    thickness: row.thickness,
    length: row.length,
    width: row.width,
  }

  if (!isEdgeMaterial(row.materialType)) {
    where.quantity = row.quantity
  }

  return where
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Выберите Excel-файл' }, { status: 400 })
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' })

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const line = index + 2
      const materialName = text(row['Название'])
      const orderNumber = text(row['Заказ'])

      if (!materialName || !orderNumber) {
        skipped += 1
        errors.push(`Строка ${line}: нет заказа или названия материала`)
        continue
      }

      const materialType = text(row['Материал'])
      const importedQrId = text(row['ID'])
      const quantity = isEdgeMaterial(materialType) ? 0 : intValue(row['Количество'])
      const data = {
        qrId: importedQrId,
        orderNumber,
        materialType,
        materialName,
        color: '',
        thickness: numberValue(row['Толщина (мм)'] ?? row['Толщина']),
        length: numberValue(row['Длина (мм)'] ?? row['Длина']),
        width: numberValue(row['Ширина (мм)'] ?? row['Ширина']),
        quantity,
        qrCreatedAt: parseDate(row['Дата создания']),
        status: normalizeStatus(row['Статус']),
        comment: text(row['Комментарий']) || undefined,
      }

      if (data.qrId) {
        const existingById = await prisma.leftover.findUnique({ where: { qrId: data.qrId } })
        if (existingById) {
          skipped += 1
          continue
        }
      }

      const duplicate = await prisma.leftover.findFirst({ where: buildDuplicateWhere(data) })
      if (duplicate) {
        skipped += 1
        continue
      }

      const leftover = await prisma.leftover.create({
        data: {
          ...data,
          qrId: data.qrId || await generateNextQrId(),
          addedBy: user.id,
        },
      })

      await prisma.history.create({
        data: {
          leftoverId: leftover.id,
          actionType: 'ADD',
          userId: user.id,
          comment: 'Остаток импортирован из Excel',
        },
      })

      created += 1
    }

    return NextResponse.json({ success: true, created, skipped, errors: errors.slice(0, 10) })
  } catch (error) {
    console.error('Import leftovers error:', error)
    return NextResponse.json({ error: 'Ошибка импорта Excel' }, { status: 500 })
  }
}
