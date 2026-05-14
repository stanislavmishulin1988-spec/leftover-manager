export interface ParsedQRData {
  id?: string
  orderNumber?: string
  materialType?: string
  materialName?: string
  color?: string
  thickness?: number
  length?: number
  width?: number
  quantity?: number
  createdAt?: string
  comment?: string
}

const aliases: Record<keyof ParsedQRData, string[]> = {
  id: ['id', 'qr', 'qrid', 'qr_id', 'код', 'ид', 'номер', 'остаток'],
  orderNumber: ['ordernumber', 'order', 'order_number', 'заказ', 'номерзаказа', 'номер_заказа'],
  materialType: ['materialtype', 'type', 'тип', 'вид', 'материалтип', 'видматериала'],
  materialName: ['materialname', 'name', 'material', 'article', 'sku', 'code', 'название', 'материал', 'артикул', 'кодматериала'],
  color: ['color', 'colour', 'цвет', 'декор'],
  thickness: ['thickness', 'толщина', 'толщ', 'h'],
  length: ['length', 'длина', 'дл', 'l'],
  width: ['width', 'ширина', 'шир', 'w'],
  quantity: ['quantity', 'qty', 'count', 'количество', 'кол', 'шт'],
  createdAt: ['createdat', 'created', 'date', 'дата', 'создан'],
  comment: ['comment', 'note', 'notes', 'комментарий', 'примечание'],
}

const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s_\-:]/g, '')

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined

  const normalized = value.replace(',', '.').match(/\d+(?:\.\d+)?/)
  if (!normalized) return undefined

  const parsed = Number(normalized[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

const setField = (data: ParsedQRData, key: string, value: unknown) => {
  const normalized = normalizeKey(key)
  const target = (Object.keys(aliases) as Array<keyof ParsedQRData>).find(field =>
    aliases[field].some(alias => normalizeKey(alias) === normalized)
  )

  if (!target || value === undefined || value === null || value === '') return

  if (target === 'thickness' || target === 'length' || target === 'width' || target === 'quantity') {
    const numberValue = toNumber(value)
    if (numberValue !== undefined) data[target] = target === 'quantity' ? Math.round(numberValue) : numberValue
    return
  }

  data[target] = String(value).trim()
}

const parseDimensions = (text: string, data: ParsedQRData) => {
  const dimensionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*[xх*×]\s*(\d+(?:[.,]\d+)?)(?:\s*[xх*×]\s*(\d+(?:[.,]\d+)?))?/i)
  if (!dimensionMatch) return

  data.length ??= toNumber(dimensionMatch[1])
  data.width ??= toNumber(dimensionMatch[2])
  data.thickness ??= toNumber(dimensionMatch[3])
}

const parseTextPairs = (text: string, data: ParsedQRData) => {
  const pairRegex = /([A-Za-zА-Яа-яЁё_ -]{2,30})\s*[:=]\s*([^;\n\r|]+)/g
  let match: RegExpExecArray | null

  while ((match = pairRegex.exec(text))) {
    setField(data, match[1], match[2])
  }
}

const guessFreeText = (text: string, data: ParsedQRData) => {
  const lower = text.toLowerCase()

  if (!data.materialType) {
    if (/(лдсп|ldsp|л д с п)/i.test(text)) data.materialType = 'ЛДСП'
    else if (/(мдф|mdf)/i.test(text)) data.materialType = 'МДФ'
    else if (/столеш/i.test(text)) data.materialType = 'Столешница'
    else if (/кромк/i.test(text)) data.materialType = 'Кромка'
  }

  if (!data.color) {
    const colorMatch = lower.match(/(?:цвет|декор|color)\s*[:=]?\s*([a-zа-яё0-9\s-]{2,40})/i)
    if (colorMatch) data.color = colorMatch[1].trim()
  }

  if (!data.thickness) {
    const thicknessMatch = lower.match(/(?:толщина|толщ|thickness)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)
    data.thickness = toNumber(thicknessMatch?.[1])
  }

  if (!data.quantity) {
    const quantityMatch = lower.match(/(?:количество|кол-во|qty|шт)\s*[:=]?\s*(\d+)/i)
    data.quantity = toNumber(quantityMatch?.[1])
  }

  if (!data.materialName) {
    const articleMatch = text.match(/(?:артикул|article|sku|code|код)\s*[:=]?\s*([A-Za-zА-Яа-яЁё0-9._/-]{2,50})/i)
    if (articleMatch) data.materialName = articleMatch[1].trim()
  }
}

export function parseUniversalQR(qrString: string): ParsedQRData {
  const raw = qrString.trim()
  const data: ParsedQRData = {}

  if (!raw) return data

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, value]) => setField(data, key, value))
    }
  } catch {
    const parts = raw.split('|')
    if (parts.length >= 2) {
      ;[
        'id',
        'orderNumber',
        'materialType',
        'materialName',
        'color',
        'thickness',
        'length',
        'width',
        'quantity',
        'createdAt',
        'comment',
      ].forEach((field, index) => setField(data, field, parts[index]))
    }

    parseTextPairs(raw, data)
  }

  parseDimensions(raw, data)
  guessFreeText(raw, data)

  if (!data.comment && raw.length <= 500) {
    data.comment = `Исходный QR: ${raw}`
  }

  return data
}
