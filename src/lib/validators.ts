import { z } from 'zod'

const optionalNumber = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string') return Number(value.replace(',', '.'))
  return value
}, z.number().nonnegative().optional())

// Схема для данных QR-кода
export const qrDataSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().optional(),
  materialType: z.string().optional(),
  materialName: z.string().optional(),
  color: z.string().optional(),
  thickness: optionalNumber,
  length: optionalNumber,
  width: optionalNumber,
  quantity: optionalNumber,
  createdAt: z.string().optional(),
  comment: z.string().optional(),
})

// Схема для ручного добавления
export const manualAddSchema = z.object({
  qrId: z.string().min(1, 'ID обязателен'),
  orderNumber: z.string().min(1, 'Номер заказа обязателен'),
  materialType: z.string().min(1, 'Вид материала обязателен'),
  materialName: z.string().min(1, 'Название материала обязательно'),
  color: z.string().min(1, 'Цвет обязателен'),
  thickness: z.string().transform(Number).refine(n => n > 0, 'Толщина > 0'),
  length: z.string().transform(Number).refine(n => n > 0, 'Длина > 0'),
  width: z.string().transform(Number).refine(n => n > 0, 'Ширина > 0'),
  quantity: z.string().transform(Number).refine(n => n > 0, 'Количество > 0'),
  qrCreatedAt: z.string(),
  comment: z.string().optional(),
})

// Схема для пользователя
export const userSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  username: z.string().min(3, 'Логин минимум 3 символа'),
  password: z.string().min(4, 'Пароль минимум 4 символа'),
  role: z.string().refine(r => ['ADMIN', 'OPERATOR', 'MASTER', 'MANAGER', 'TECHNOLOGIST'].includes(r), 'Неверная роль'),
})

export const registerSchema = z.object({
  lastName: z.string().min(1, 'Фамилия обязательна'),
  firstName: z.string().min(1, 'Имя обязательно'),
  middleName: z.string().optional(),
  username: z.string().min(3, 'Логин минимум 3 символа'),
  password: z.string().min(4, 'Пароль минимум 4 символа'),
  role: z.string().refine(r => ['OPERATOR', 'MASTER', 'MANAGER', 'TECHNOLOGIST'].includes(r), 'Неверная должность'),
})

// Схема для изменения статуса
export const statusChangeSchema = z.object({
  status: z.string().refine(s => ['AVAILABLE', 'RESERVED', 'USED', 'SCRAPPED', 'DELETED'].includes(s)),
  comment: z.string().optional(),
  orderNumber: z.string().optional(),
})

export const bulkLeftoverSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['status', 'delete', 'update']),
  status: z.string().optional(),
  orderNumber: z.string().optional(),
  materialType: z.string().optional(),
  materialName: z.string().optional(),
  thickness: optionalNumber,
  length: optionalNumber,
  width: optionalNumber,
  quantity: optionalNumber,
  comment: z.string().optional(),
})

// Схема для фильтров
export const filtersSchema = z.object({
  search: z.string().optional(),
  materialType: z.string().optional(),
  color: z.string().optional(),
  thickness: z.string().transform(Number).optional(),
  lengthMin: z.string().transform(Number).optional(),
  lengthMax: z.string().transform(Number).optional(),
  widthMin: z.string().transform(Number).optional(),
  widthMax: z.string().transform(Number).optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  showDeleted: z.string().transform(v => v === 'true').optional(),
})

export type QRDataInput = z.infer<typeof qrDataSchema>
export type ManualAddInput = z.infer<typeof manualAddSchema>
export type UserInput = z.infer<typeof userSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type StatusChangeInput = z.infer<typeof statusChangeSchema>
export type BulkLeftoverInput = z.infer<typeof bulkLeftoverSchema>
export type FiltersInput = z.infer<typeof filtersSchema>
