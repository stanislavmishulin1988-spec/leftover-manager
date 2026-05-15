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
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [filters, setFilters] = useState({
    materialType: '',
    materialName: '',
    color: '',
    thickness: '',
    orderNumber: '',
    status: '',
  })

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
      const exportData = filteredLeftovers.map(l => ({
        'ID': l.qrId,
        'Заказ': l.orderNumber,
        'Материал': l.materialType,
        'Название': l.materialName,
        'Толщина (мм)': l.thickness,
        'Длина (мм)': l.length,
        'Ширина (мм)': l.width,
        'Количество': l.quantity,
        'Статус': getStatusLabel(l.status as LeftoverStatus),
        'Дата создания': new Date(l.qrCreatedAt).toLocaleDateString('ru-RU'),
        'Дата добавления': new Date(l.addedAt).toLocaleDateString('ru-RU'),
        'Кто добавил?': l.addedByUser?.name || '',
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
        'ID', 'Заказ', 'Материал', 'Название',
        'Толщина', 'Длина', 'Ширина', 'Количество',
        'Статус', 'Дата создания', 'Дата добавления', 'Кто добавил?', 'Комментарий'
      ]

      const csvData = filteredLeftovers.map(l => [
        l.qrId,
        l.orderNumber,
        l.materialType,
        l.materialName,
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

  const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setImportMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/leftovers/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok) {
        setImportMessage(`Импорт завершен: добавлено ${data.created}, пропущено ${data.skipped}`)
        await loadLeftovers()
      } else {
        setImportMessage(data.error || 'Ошибка импорта')
      }
    } catch {
      setImportMessage('Ошибка подключения к серверу')
    } finally {
      setImportLoading(false)
      event.target.value = ''
    }
  }

  const getStatusLabel = (status: LeftoverStatus | string) => {
    const labels: Record<LeftoverStatus, string> = {
      AVAILABLE: 'В наличии',
      RESERVED: 'Зарезервирован',
      USED: 'Использован',
      SCRAPPED: 'Списан',
      DELETED: 'Удален',
    }
    return labels[status as LeftoverStatus] ?? status
  }

  const filteredLeftovers = leftovers.filter(leftover => {
    const materialName = leftover.materialName.toLowerCase()
    const color = leftover.color.toLowerCase()
    const materialTypeMatches = !filters.materialType || leftover.materialType === filters.materialType
    const materialNameMatches = !filters.materialName || materialName.includes(filters.materialName.toLowerCase())
    const colorMatches =
      !filters.color ||
      color.includes(filters.color.toLowerCase()) ||
      materialName.includes(filters.color.toLowerCase())
    const thicknessMatches = !filters.thickness || leftover.thickness === Number(filters.thickness)
    const orderMatches = !filters.orderNumber || leftover.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())
    const statusMatches = !filters.status || leftover.status === filters.status

    return materialTypeMatches && materialNameMatches && colorMatches && thicknessMatches && orderMatches && statusMatches
  })

  const resetFilters = () => {
    setFilters({
      materialType: '',
      materialName: '',
      color: '',
      thickness: '',
      orderNumber: '',
      status: '',
    })
  }

  const unitCount = (leftover: Leftover) => leftover.quantity > 0 ? leftover.quantity : 1
  const areaInSquareMeters = (leftover: Leftover) =>
    (leftover.length * leftover.width * unitCount(leftover)) / 1000000
  const lengthInMeters = (leftover: Leftover) =>
    (leftover.length * unitCount(leftover)) / 1000

  // Группировка данных
  const getGroupedData = () => {
    if (!grouping) return null

    const groups: Record<string, Leftover[]> = {}

    filteredLeftovers.forEach(leftover => {
      let key: string

      switch (grouping) {
        case 'materialType':
          key = leftover.materialType
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
    total: filteredLeftovers.length,
    available: filteredLeftovers.filter(l => l.status === 'AVAILABLE').length,
    reserved: filteredLeftovers.filter(l => l.status === 'RESERVED').length,
    used: filteredLeftovers.filter(l => l.status === 'USED').length,
    scrapped: filteredLeftovers.filter(l => l.status === 'SCRAPPED' || l.status === 'DELETED').length,
  }

  const materialSummary = ['ЛДСП', 'МДФ', 'ХДФ', 'Стекло'].map(materialType => ({
    materialType,
    amount: filteredLeftovers
      .filter(leftover => leftover.materialType === materialType)
      .reduce((sum, leftover) => sum + areaInSquareMeters(leftover), 0),
  }))

  const countertopLength = filteredLeftovers
    .filter(leftover => leftover.materialType === 'Столешница')
    .reduce((sum, leftover) => sum + lengthInMeters(leftover), 0)

  const edgeLength = filteredLeftovers
    .filter(leftover => leftover.materialType === 'Кромка')
    .reduce((sum, leftover) => sum + lengthInMeters(leftover), 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            📊 Отчеты и группировки
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Фильтры отчета
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Все показатели ниже считаются по выбранным условиям
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <select
                value={filters.materialType}
                onChange={e => setFilters({ ...filters, materialType: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Все виды материалов</option>
                <option value="ЛДСП">ЛДСП</option>
                <option value="МДФ">МДФ</option>
                <option value="ХДФ">ХДФ</option>
                <option value="Стекло">Стекло</option>
                <option value="Столешница">Столешница</option>
                <option value="Кромка">Кромка</option>
              </select>
              <input
                value={filters.materialName}
                onChange={e => setFilters({ ...filters, materialName: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Наименование материала"
              />
              <input
                value={filters.color}
                onChange={e => setFilters({ ...filters, color: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Цвет / декор"
              />
              <input
                type="number"
                value={filters.thickness}
                onChange={e => setFilters({ ...filters, thickness: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Толщина, мм"
              />
              <input
                value={filters.orderNumber}
                onChange={e => setFilters({ ...filters, orderNumber: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Номер заказа"
              />
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Все статусы</option>
                <option value="AVAILABLE">В наличии</option>
                <option value="RESERVED">Зарезервирован</option>
                <option value="USED">Использован</option>
                <option value="SCRAPPED">Списан</option>
                <option value="DELETED">Удален</option>
              </select>
            </div>
          </div>

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

          {/* Импорт и экспорт */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Импорт и экспорт данных
            </h2>
            <div className="flex flex-wrap gap-4">
              <label className={`px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors ${importLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                {importLoading ? 'Импорт...' : '📥 Импорт из Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={importFromExcel}
                  disabled={importLoading}
                  className="hidden"
                />
              </label>
              <button
                onClick={exportToExcel}
                disabled={exportLoading || filteredLeftovers.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? 'Экспорт...' : '📄 Экспорт в Excel'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredLeftovers.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📄 Экспорт в CSV
              </button>
            </div>
            {importMessage && (
              <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{importMessage}</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Производственные показатели
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materialSummary.map(item => (
                <div key={item.materialType} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{item.materialType}</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {item.amount.toFixed(2)} м²
                  </div>
                </div>
              ))}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Столешница</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {countertopLength.toFixed(2)} м
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Кромка</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {edgeLength.toFixed(2)} м
                </div>
              </div>
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
              Все остатки ({filteredLeftovers.length})
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
                  {filteredLeftovers.map(item => (
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
