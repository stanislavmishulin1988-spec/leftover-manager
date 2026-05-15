'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover, LeftoverFilters, LeftoverStatus } from '@/lib/types'

export default function LeftoversPage() {
  const [leftovers, setLeftovers] = useState<Leftover[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [qrSearchOpen, setQrSearchOpen] = useState(false)
  const [qrSearchScanning, setQrSearchScanning] = useState(false)
  const [qrSearchError, setQrSearchError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<LeftoverStatus>('AVAILABLE')
  const [bulkEdit, setBulkEdit] = useState({
    orderNumber: '',
    materialType: '',
    materialName: '',
    thickness: '',
    length: '',
    width: '',
    quantity: '',
    comment: '',
  })
  const qrScannerRef = useRef<any>(null)

  const [filters, setFilters] = useState<LeftoverFilters>({
    search: '',
    materialType: '',
    status: undefined,
  })

  const materialTypes = ['ЛДСП', 'МДФ', 'ХДФ', 'Столешница', 'Стекло', 'Кромка', 'Фурнитура', 'Другое']
  const statuses: LeftoverStatus[] = ['AVAILABLE', 'RESERVED', 'USED', 'SCRAPPED', 'DELETED']

  useEffect(() => {
    loadLeftovers()
  }, [filters, showDeleted])

  useEffect(() => {
    return () => {
      void stopQrSearch()
    }
  }, [])

  const loadLeftovers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.materialType) params.set('materialType', filters.materialType)
      if (filters.status) params.set('status', filters.status)
      if (showDeleted) params.set('showDeleted', 'true')

      const res = await fetch(`/api/leftovers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLeftovers(data.leftovers)
        setSelectedIds(current => current.filter(id => data.leftovers.some((item: Leftover) => item.id === id)))
      }
    } catch (error) {
      console.error('Error loading leftovers:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      materialType: '',
      status: undefined,
    })
    setShowDeleted(false)
  }

  const stopQrSearch = async () => {
    const scanner = qrScannerRef.current
    qrScannerRef.current = null
    setQrSearchScanning(false)

    try {
      if (scanner?.isScanning) {
        await scanner.stop()
      } else {
        await scanner?.stop?.()
      }
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner?.clear?.()
    } catch {
      // Reader may already be cleared.
    }
  }

  const startQrSearch = async () => {
    setQrSearchOpen(true)
    setQrSearchError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setQrSearchError('Этот браузер не дал доступ к камере. Вставьте QR-код в поле поиска вручную.')
      return
    }

    try {
      await stopQrSearch()
      const module = await import('html5-qrcode')
      const scanner = new module.Html5Qrcode('leftovers-qr-search-reader')
      qrScannerRef.current = scanner
      setQrSearchScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 5,
          qrbox: { width: 300, height: 300 },
          disableFlip: false,
        },
        async (decodedText: string) => {
          setFilters(current => ({ ...current, search: decodedText }))
          setShowFilters(true)
          setQrSearchOpen(false)
          await stopQrSearch()
        },
        () => {}
      )
    } catch (error: any) {
      console.error('QR search scanner error:', error)
      setQrSearchError(error?.message || 'Не удалось запустить камеру для поиска.')
      await stopQrSearch()
    }
  }

  const getStatusLabel = (status: LeftoverStatus) => {
    const labels: Record<LeftoverStatus, string> = {
      AVAILABLE: 'В наличии',
      RESERVED: 'Зарезервирован',
      USED: 'Использован',
      SCRAPPED: 'Списан',
      DELETED: 'Удален',
    }
    return labels[status]
  }

  const missingValue = (label = 'Не указано') => (
    <span className="font-medium text-red-600 dark:text-red-400">{label}</span>
  )

  const hasActiveSearch = Boolean(filters.search?.trim())
  const isEdgeMaterial = (leftover: Leftover) => leftover.materialType === 'Кромка'
  const allVisibleSelected = leftovers.length > 0 && selectedIds.length === leftovers.length

  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? [] : leftovers.map(leftover => leftover.id))
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const runBulkAction = async (payload: Record<string, unknown>) => {
    if (selectedIds.length === 0) return
    setBulkLoading(true)

    try {
      const res = await fetch('/api/leftovers/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, ...payload }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Ошибка массовой операции')
        return
      }

      setSelectedIds([])
      setShowBulkEdit(false)
      await loadLeftovers()
    } catch {
      alert('Ошибка подключения к серверу')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              📋 База остатков
            </h1>
            <div className="flex items-center gap-3">
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={e => setShowDeleted(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span>Показать удаленные</span>
              </label>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
              >
                {showFilters ? 'Скрыть фильтры' : 'Фильтры'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={filters.search || ''}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
            placeholder="Быстрый поиск: ID, заказ, материал или вставьте QR-код"
          />
          <button
            type="button"
            onClick={() => {
              setShowFilters(true)
              void startQrSearch()
            }}
            className="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Сканировать QR
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg transition-colors"
          >
            Сбросить
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Выбрано: {selectedIds.length}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as LeftoverStatus)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => void runBulkAction({ action: 'status', status: bulkStatus })}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
                >
                  Изменить статус
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkEdit(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => {
                    if (window.confirm(`Удалить выбранные остатки: ${selectedIds.length}?`)) {
                      void runBulkAction({ action: 'delete' })
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Фильтры */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск
                </label>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="ID, заказ, материал..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск по QR-коду
                </label>
                <button
                  type="button"
                  onClick={() => void startQrSearch()}
                  className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                >
                  Сканировать QR для поиска
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Вид материала
                </label>
                <select
                  value={filters.materialType || ''}
                  onChange={e => setFilters({ ...filters, materialType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Все</option>
                  {materialTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={filters.status || ''}
                  onChange={e => setFilters({ ...filters, status: e.target.value as LeftoverStatus | '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Все</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {qrSearchOpen && (
              <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                <div className="mx-auto max-w-sm">
                  <div
                    id="leftovers-qr-search-reader"
                    className="min-h-[260px] overflow-hidden rounded-xl bg-black"
                  />
                  {qrSearchError && (
                    <div className="mt-3 rounded-lg bg-red-100 p-3 text-center text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
                      {qrSearchError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQrSearchOpen(false)
                      void stopQrSearch()
                    }}
                    className="mt-3 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors text-sm"
                  >
                    Закрыть сканер
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        {/* Таблица */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Заказ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Материал
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Размер
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Кол-во
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Загрузка...
                    </td>
                  </tr>
                ) : leftovers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Остатки не найдены
                    </td>
                  </tr>
                ) : (
                  leftovers.map(leftover => (
                    <tr
                      key={leftover.id}
                      className={`cursor-pointer ${
                        hasActiveSearch
                          ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/40'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => window.location.href = `/leftovers/${leftover.id}`}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={event => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(leftover.id)}
                          onChange={() => toggleSelected(leftover.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {leftover.qrId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {leftover.orderNumber || missingValue('Заказ не указан')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">
                          {leftover.materialName || missingValue('Материал не указан')}
                        </div>
                        {!leftover.materialType && (
                          <div className="text-xs">{missingValue('Вид не указан')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {leftover.length > 0 ? leftover.length : missingValue('длина?')} ×{' '}
                        {leftover.width > 0 ? leftover.width : missingValue('ширина?')} мм
                        <div className="text-xs text-gray-500">
                          {leftover.thickness > 0 ? `${leftover.thickness} мм` : missingValue('Толщина не указана')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {isEdgeMaterial(leftover)
                          ? <span className="text-gray-500">Пог. материал</span>
                          : leftover.quantity > 0
                            ? `${leftover.quantity} шт.`
                            : missingValue('Кол-во не указано')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={leftover.status as LeftoverStatus} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(leftover.addedAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Итоги */}
        {!loading && leftovers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Найдено: {leftovers.length} остатков
          </div>
        )}

        {showBulkEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Массовое редактирование
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Заполните только те поля, которые нужно изменить у всех выбранных записей.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <input value={bulkEdit.orderNumber} onChange={e => setBulkEdit({ ...bulkEdit, orderNumber: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Номер заказа" />
                <select value={bulkEdit.materialType} onChange={e => setBulkEdit({ ...bulkEdit, materialType: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white">
                  <option value="">Вид материала без изменений</option>
                  {materialTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <input value={bulkEdit.materialName} onChange={e => setBulkEdit({ ...bulkEdit, materialName: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Наименование материала" />
                <input type="number" value={bulkEdit.thickness} onChange={e => setBulkEdit({ ...bulkEdit, thickness: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Толщина, мм" />
                <input type="number" value={bulkEdit.length} onChange={e => setBulkEdit({ ...bulkEdit, length: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Длина, мм" />
                <input type="number" value={bulkEdit.width} onChange={e => setBulkEdit({ ...bulkEdit, width: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Ширина, мм" />
                <input type="number" value={bulkEdit.quantity} onChange={e => setBulkEdit({ ...bulkEdit, quantity: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Количество" />
                <input value={bulkEdit.comment} onChange={e => setBulkEdit({ ...bulkEdit, comment: e.target.value })} className="px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Комментарий" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowBulkEdit(false)} className="px-4 py-2 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-white">
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => void runBulkAction({
                    action: 'update',
                    ...Object.fromEntries(Object.entries(bulkEdit).filter(([, value]) => value !== '').map(([key, value]) => [
                      key,
                      ['thickness', 'length', 'width', 'quantity'].includes(key) ? Number(value) : value,
                    ])),
                  })}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
