'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover } from '@/lib/types'

interface ScanResult {
  success: boolean
  message: string
  leftover?: Leftover
  error?: string
}

export default function ScanPage() {
  const [qrInput, setQrInput] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentLeftovers, setRecentLeftovers] = useState<Leftover[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Загрузка последних добавленных
  useEffect(() => {
    loadRecentLeftovers()
    // Фокус на поле ввода при загрузке
    inputRef.current?.focus()
  }, [])

  const loadRecentLeftovers = async () => {
    try {
      const res = await fetch('/api/leftovers')
      if (res.ok) {
        const data = await res.json()
        setRecentLeftovers(data.leftovers.slice(0, 10))
      }
    } catch (error) {
      console.error('Error loading recent:', error)
    }
  }

  const parseQRData = (qrString: string): any => {
    // Попытка распарсить JSON
    try {
      const parsed = JSON.parse(qrString)
      if (parsed.id && parsed.orderNumber && parsed.materialType) {
        return parsed
      }
    } catch {
      // Не JSON, пробуем распарсить как строку с разделителями
      // Формат: ID|orderNumber|materialType|materialName|color|thickness|length|width|quantity|createdAt
      const parts = qrString.split('|')
      if (parts.length >= 10) {
        return {
          id: parts[0],
          orderNumber: parts[1],
          materialType: parts[2],
          materialName: parts[3],
          color: parts[4],
          thickness: parseFloat(parts[5]),
          length: parseFloat(parts[6]),
          width: parseFloat(parts[7]),
          quantity: parseInt(parts[8]),
          createdAt: parts[9],
          comment: parts[10] || '',
        }
      }
    }
    return null
  }

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!qrInput.trim()) {
      setResult({ success: false, message: 'Введите QR-код', error: 'empty' })
      return
    }

    setLoading(true)
    setResult(null)

    const qrData = parseQRData(qrInput.trim())

    if (!qrData) {
      setResult({
        success: false,
        message: 'Неверный формат QR-кода',
        error: 'invalid_format',
      })
      setLoading(false)
      setQrInput('')
      return
    }

    try {
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({
          success: true,
          message: 'Остаток успешно добавлен!',
          leftover: data.leftover,
        })
        setQrInput('')
        loadRecentLeftovers()
      } else if (data.error === 'duplicate') {
        setResult({
          success: false,
          message: 'Этот QR-код уже есть в базе',
          leftover: data.leftover,
          error: 'duplicate',
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Ошибка добавления',
          error: 'api_error',
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Ошибка подключения к серверу',
        error: 'network_error',
      })
    } finally {
      setLoading(false)
      // Возвращаем фокус на поле ввода
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Форма сканирования */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
              📷 Сканирование QR-кода
            </h1>

            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Отсканируйте или введите QR-код
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Отсканируйте QR-код или введите данные вручную"
                  autoComplete="off"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  USB-сканер работает автоматически — просто отсканируйте код
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !qrInput.trim()}
                className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white text-xl font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Обработка...' : 'Добавить остаток'}
              </button>
            </form>

            {/* Результат */}
            {result && (
              <div
                className={`mt-6 p-6 rounded-xl ${
                  result.success
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-yellow-100 dark:bg-yellow-900'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <span className="text-3xl">
                    {result.success ? '✅' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`text-lg font-medium ${
                        result.success
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-yellow-800 dark:text-yellow-200'
                      }`}
                    >
                      {result.message}
                    </p>

                    {result.leftover && (
                      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">ID:</span>
                            <span className="ml-2 font-medium dark:text-white">
                              {result.leftover.qrId}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Материал:</span>
                            <span className="ml-2 font-medium dark:text-white">
                              {result.leftover.materialName}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Размер:</span>
                            <span className="ml-2 font-medium dark:text-white">
                              {result.leftover.length} × {result.leftover.width} мм
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Статус:</span>
                            <span className="ml-2">
                              <StatusBadge status={result.leftover.status as LeftoverStatus} />
                            </span>
                          </div>
                        </div>
                        {result.error === 'duplicate' && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            Добавлен:{' '}
                            {new Date(result.leftover.addedAt).toLocaleDateString('ru-RU')}
                            {result.leftover.addedByUser && (
                              <> ({result.leftover.addedByUser.name})</>
                            )}
                          </p>
                        )}
                        <a
                          href={`/leftovers/${result.leftover.id}`}
                          className="mt-3 inline-block text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Подробнее →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Последние добавленные */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Последние добавленные
            </h2>

            {recentLeftovers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Пока нет добавленных остатков
              </p>
            ) : (
              <div className="space-y-3">
                {recentLeftovers.map(leftover => (
                  <a
                    key={leftover.id}
                    href={`/leftovers/${leftover.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {leftover.materialName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {leftover.length} × {leftover.width} мм •{' '}
                          {new Date(leftover.addedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <StatusBadge status={leftover.status as LeftoverStatus} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
