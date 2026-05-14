'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover } from '@/lib/types'

export default function AddPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Leftover | null>(null)

  const [formData, setFormData] = useState({
    qrId: '',
    orderNumber: '',
    materialType: 'ЛДСП',
    materialName: '',
    color: '',
    thickness: '',
    length: '',
    width: '',
    quantity: '1',
    qrCreatedAt: new Date().toISOString().split('T')[0],
    comment: '',
  })

  const materialTypes = ['ЛДСП', 'МДФ', 'Столешница', 'Кромка', 'Фурнитура', 'Другое']

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Валидация
    const requiredFields = ['qrId', 'orderNumber', 'materialType', 'materialName', 'color', 'thickness', 'length', 'width', 'quantity']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      setError('Заполните обязательные поля')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.qrId,
          orderNumber: formData.orderNumber,
          materialType: formData.materialType,
          materialName: formData.materialName,
          color: formData.color,
          thickness: parseFloat(formData.thickness),
          length: parseFloat(formData.length),
          width: parseFloat(formData.width),
          quantity: parseInt(formData.quantity),
          createdAt: formData.qrCreatedAt,
          comment: formData.comment,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(data.leftover)
        // Очистка формы
        setFormData({
          qrId: '',
          orderNumber: '',
          materialType: 'ЛДСП',
          materialName: '',
          color: '',
          thickness: '',
          length: '',
          width: '',
          quantity: '1',
          qrCreatedAt: new Date().toISOString().split('T')[0],
          comment: '',
        })
      } else if (data.error === 'duplicate') {
        setError('Такой ID уже существует в базе')
      } else {
        setError(data.error || 'Ошибка добавления')
      }
    } catch {
      setError('Ошибка подключения к серверу')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-green-100 dark:bg-green-900 rounded-2xl shadow-lg p-8 text-center">
              <span className="text-6xl mb-4 block">✅</span>
              <h1 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
                Остаток успешно добавлен!
              </h1>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-medium dark:text-white">{success.qrId}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Материал:</span>
                    <p className="font-medium dark:text-white">{success.materialName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Размер:</span>
                    <p className="font-medium dark:text-white">
                      {success.length} × {success.width} мм
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Статус:</span>
                    <StatusBadge status={success.status} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={`/leftovers/${success.id}`}
                  className="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  Подробнее
                </a>
                <button
                  onClick={() => setSuccess(null)}
                  className="flex-1 py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Добавить еще
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              ➕ Ручное добавление остатка
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ID остатка */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ID остатка *
                  </label>
                  <input
                    type="text"
                    name="qrId"
                    value={formData.qrId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="OST-2026-000001"
                    required
                  />
                </div>

                {/* Номер заказа */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Номер заказа *
                  </label>
                  <input
                    type="text"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="2458"
                    required
                  />
                </div>

                {/* Вид материала */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Вид материала *
                  </label>
                  <select
                    name="materialType"
                    value={formData.materialType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    {materialTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Название материала */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название материала *
                  </label>
                  <input
                    type="text"
                    name="materialName"
                    value={formData.materialName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Egger U708"
                    required
                  />
                </div>

                {/* Цвет */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Цвет *
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Светло-серый"
                    required
                  />
                </div>

                {/* Толщина */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Толщина (мм) *
                  </label>
                  <input
                    type="number"
                    name="thickness"
                    value={formData.thickness}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="16"
                    step="0.1"
                    required
                  />
                </div>

                {/* Длина */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Длина (мм) *
                  </label>
                  <input
                    type="number"
                    name="length"
                    value={formData.length}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="1200"
                    required
                  />
                </div>

                {/* Ширина */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ширина (мм) *
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="450"
                    required
                  />
                </div>

                {/* Количество */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Количество *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>

                {/* Дата создания */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата создания
                  </label>
                  <input
                    type="date"
                    name="qrCreatedAt"
                    value={formData.qrCreatedAt}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Комментарий
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Остаток после распила кухни"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white text-lg font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Добавление...' : 'Добавить остаток'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
