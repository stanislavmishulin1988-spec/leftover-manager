'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover, LeftoverFilters, LeftoverStatus } from '@/lib/types'

export default function LeftoversPage() {
  const [leftovers, setLeftovers] = useState<Leftover[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const [filters, setFilters] = useState<LeftoverFilters>({
    search: '',
    materialType: '',
    color: '',
    status: undefined,
  })

  const materialTypes = ['ЛДСП', 'МДФ', 'Столешница', 'Кромка', 'Фурнитура', 'Другое']
  const statuses: LeftoverStatus[] = ['AVAILABLE', 'RESERVED', 'USED', 'SCRAPPED', 'DELETED']

  useEffect(() => {
    loadLeftovers()
  }, [filters, showDeleted])

  const loadLeftovers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.materialType) params.set('materialType', filters.materialType)
      if (filters.color) params.set('color', filters.color)
      if (filters.status) params.set('status', filters.status)
      if (showDeleted) params.set('showDeleted', 'true')

      const res = await fetch(`/api/leftovers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLeftovers(data.leftovers)
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
      color: '',
      status: undefined,
    })
    setShowDeleted(false)
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
                  Цвет
                </label>
                <input
                  type="text"
                  value={filters.color || ''}
                  onChange={e => setFilters({ ...filters, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Например, серый"
                />
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
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
                    Заказ
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
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Загрузка...
                    </td>
                  </tr>
                ) : leftovers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Остатки не найдены
                    </td>
                  </tr>
                ) : (
                  leftovers.map(leftover => (
                    <tr
                      key={leftover.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => window.location.href = `/leftovers/${leftover.id}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {leftover.qrId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{leftover.materialName}</div>
                        <div className="text-xs text-gray-500">{leftover.color}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {leftover.length} × {leftover.width} мм
                        {leftover.thickness > 0 && (
                          <div className="text-xs text-gray-500">{leftover.thickness} мм</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {leftover.quantity} шт.
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {leftover.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={leftover.status} />
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
      </main>
    </div>
  )
}
