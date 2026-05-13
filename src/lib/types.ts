// Типы для приложения учета остатков

export type Role = 'ADMIN' | 'OPERATOR' | 'MASTER';

export type LeftoverStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'SCRAPPED' | 'DELETED';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role | string;
  createdAt: string;
  updatedAt: string;
}

export interface Leftover {
  id: string;
  qrId: string;
  orderNumber: string;
  materialType: string;
  materialName: string;
  color: string;
  thickness: number;
  length: number;
  width: number;
  quantity: number;
  qrCreatedAt: string;
  addedAt: string;
  addedBy: string;
  addedByUser?: User;
  status: LeftoverStatus | string;
  reservedForOrder?: string;
  reservedBy?: string;
  reservedByUser?: User;
  reservedAt?: string;
  usedForOrder?: string;
  usedAt?: string;
  usedBy?: string;
  comment?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedByUser?: User;
  updatedAt: string;
}

export interface History {
  id: string;
  leftoverId: string;
  actionType: string;
  oldValue?: string;
  newValue?: string;
  userId: string;
  user?: User;
  comment?: string;
  createdAt: string;
}

export interface QRData {
  id: string;
  orderNumber: string;
  materialType: string;
  materialName: string;
  color: string;
  thickness: number;
  length: number;
  width: number;
  quantity: number;
  createdAt: string;
  comment?: string;
}

export interface ScanResult {
  success: boolean;
  message: string;
  leftover?: Leftover;
  error?: string;
}

export interface LeftoverFilters {
  search?: string;
  materialType?: string;
  color?: string;
  thickness?: number;
  lengthMin?: number;
  lengthMax?: number;
  widthMin?: number;
  widthMax?: number;
  status?: LeftoverStatus | string;
  dateFrom?: string;
  dateTo?: string;
  showDeleted?: boolean;
}

export interface GroupingOption {
  field: keyof Leftover;
  label: string;
}

export const statusLabels: Record<LeftoverStatus, string> = {
  AVAILABLE: 'В наличии',
  RESERVED: 'Зарезервирован',
  USED: 'Использован',
  SCRAPPED: 'Списан',
  DELETED: 'Удален',
};

export const statusColors: Record<LeftoverStatus, string> = {
  AVAILABLE: 'status-available',
  RESERVED: 'status-reserved',
  USED: 'status-used',
  SCRAPPED: 'status-scrapped',
  DELETED: 'status-deleted',
};

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Администратор',
  OPERATOR: 'Оператор',
  MASTER: 'Мастер',
};
