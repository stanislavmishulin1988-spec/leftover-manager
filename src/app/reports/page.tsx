'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover, LeftoverStatus } from '@/lib/types'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const [leftovers, setLeftovers] = useState<Leftover[]>([])
  const [loading, setLoading] = useState(true)
  const [grouping, setGrouping] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    loadLeftovers()
  }, [])

  const loadLeftovers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leftovers')
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

  const exportToExcel = async () => {
    setExportLoading(true)
    try {
      // Подготовка данных для экспорта
      const exportData = leftovers.map(l => ({
        'ID': l.qrId,
        'Заказ': l.orderNumber,
        'Материал': l.materialType,
        'Название': l.materialName,
        'Цвет': l.color,
        'Толщина (мм)': l.thickness,
        'Длина (мм)': l.length,
        'Ширина (мм)': l.width,
        'Количество': l.quantity,
        'Статус': getStatusLabel(l.status as LeftoverStatus),
        'Дата создания': new Date(l.qrCreatedAt).toLocaleDateString('ru-RU'),
        'Дата добавления': new Date(l.addedAt).toLocaleDateString('ru-RU'),
        'Добавил': l.addedByUser?.name || '',
        'Комментарий': l.comment || '',
      }))

      // Создание workbook
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Остатки')

      // Генерация имени файла
      const fileName = `остатки_${new Date().toISOString().split('T')[0]}.xlsx`

      // Скачивание
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Export error:', error)
      alert('Ошибка экспорта')
    } finally {
      setExportLoading(false)
    }
  }

  const exportToCSV = () => {
    try {
      const headers = [
        'ID', 'Заказ', 'Материал', 'Название', 'Цвет',
        'Толщина', 'Длина', 'Ширина', 'Количество',
        'Статус', 'Дата создания', 'Дата добавления', 'Добавил', 'Комментарий'
      ]

      const csvData = leftovers.map(l => [
        l.qrId,
        l.orderNumber,
        l.materialType,
        l.materialName,
        l.color,
        l.thickness,
        l.length,
        l.width,
        l.quantity,
        getStatusLabel(l.status as LeftoverStatus),
        new Date(l.qrCreatedAt).toLocaleDateString('ru-RU'),
        new Date(l.addedAt).toLocaleDateString('ru-RU'),
        l.addedByUser?.name || '',
        l.comment || '',
      ])

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `остатки_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (error) {
      console.error('CSV export error:', error)
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

  // Группировка данных
  const getGroupedData = () => {
    if (!grouping) return null

    const groups: Record<string, Leftover[]> = {}

    leftovers.forEach(leftover => {
      let key: string

      switch (grouping) {
        case 'materialType':
          key = leftover.materialType
          break
        case 'color':
          key = leftover.color
          break
        case 'status':
          key = getStatusLabel(leftover.status as LeftoverStatus)
          break
        case 'orderNumber':
          key = leftover.orderNumber
          break
        default:
          key = 'Все'
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(leftover)
    })

    return groups
  }

  const groupedData = getGroupedData()

  // Статистика
  const stats = {
    total: leftovers.length,
    available: leftovers.filter(l => l.status === 'AVAILABLE').length,
    reserved: leftovers.filter(l => l.status === 'RESERVED').length,
    used: leftovers.filter(l => l.status === 'USED').length,
    scrapped: leftovers.filter(l => l.status === 'SCRAPPED' || l.status === 'DELETED').length,
    totalArea: leftovers.reduce((sum, l) => sum + (l.length * l.width * l.quantity), 0) / 1000000, // м²
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            📊 Отчеты и группировки
          </h1>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Всего</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900 rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                {stats.available}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">В наличии</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                {stats.reserved}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Зарезервировано</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                {stats.used}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Использовано</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900 rounded-xl shadow p-4 text-center">
              <div className="text-3xl font-bold text-red-800 dark:text-red-200">
                {stats.scrapped}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Списано</div>
            </div>
          </div>

          {/* Экспорт */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Экспорт данных
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={exportToExcel}
                disabled={exportLoading || leftovers.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? 'Экспорт...' : '📄 Экспорт в Excel'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={leftovers.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📄 Экспорт в CSV
              </button>
            </div>
          </div>

          {/* Группировка */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Группировка
            </h2>
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={grouping}
                onChange={e => setGrouping(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Без группировки</option>
                <option value="materialType">По виду материала</option>
                <option value="color">По цвету</option>
                <option value="status">По статусу</option>
                <option value="orderNumber">По номеру заказа</option>
              </select>
            </div>

            {loading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Загрузка...
              </p>
            ) : groupedData ? (
              <div className="space-y-6">
                {Object.entries(groupedData).map(([groupName, items]) => (
                  <div key={groupName}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {groupName}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {items.length} шт.
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">ID</th>
                            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Материал</th>
                            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Размер</th>
                            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="border-t border-gray-200 dark:border-gray-600">
                              <td className="px-3 py-2 text-gray-800 dark:text-white">{item.qrId}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.materialName}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                {item.length} × {item.width} мм
                              </td>
                              <td className="px-3 py-2">
                                <StatusBadge status={item.status as LeftoverStatus} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Выберите тип группировки для отображения данных
              </div>
            )}
          </div>

          {/* Все остатки */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Все остатки ({leftovers.length})
            </h2>
            <div className="table-responsive">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">ID</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Материал</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Размер</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Заказ</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Статус</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {leftovers.map(item => (
                    <tr key={item.id} className="border-t border-gray-200 dark:border-gray-600">
                      <td className="px-3 py-2 text-gray-800 dark:text-white">{item.qrId}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.materialName}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {item.length} × {item.width} мм
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.orderNumber}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status as LeftoverStatus} />
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {new Date(item.addedAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
