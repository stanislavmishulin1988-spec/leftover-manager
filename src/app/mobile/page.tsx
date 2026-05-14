'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Leftover } from '@/lib/types'

export default function MobilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string; leftover?: Leftover } | null>(null)

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

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return

    try {
      const qrData = JSON.parse(scanInput.trim())
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: 'Добавлено!', leftover: data.leftover })
      } else if (data.error === 'duplicate') {
        setResult({ success: false, message: 'Уже есть в базе', leftover: data.leftover })
      } else {
        setResult({ success: false, message: data.error || 'Ошибка' })
      }
    } catch {
      setResult({ success: false, message: 'Неверный формат JSON' })
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
        setResult({ success: true, message: 'Остаток добавлен!', leftover: data.leftover })
        setShowManualForm(false)
        setFormData({
          qrId: '', orderNumber: '', materialType: 'ЛДСП', materialName: '',
          color: '', thickness: '', length: '', width: '', quantity: '1',
          qrCreatedAt: new Date().toISOString().split('T')[0], comment: '',
        })
      } else if (data.error === 'duplicate') {
        setResult({ success: false, message: 'Такой ID уже есть', leftover: data.leftover })
      } else {
        setResult({ success: false, message: data.error || 'Ошибка добавления' })
      }
    } catch {
      setResult({ success: false, message: 'Ошибка подключения' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">🏭 Учет остатков</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 font-medium"
          >
            Выход
          </button>
        </div>
      </header>

      <main className="p-4 pb-24">
        {user && (
          <p className="text-sm text-gray-600 mb-4">
            👤 {user.name} ({user.role === 'ADMIN' ? 'Админ' : user.role === 'MASTER' ? 'Мастер' : 'Оператор'})
          </p>
        )}

        {/* Результат */}
        {result && (
          <div className={`p-4 rounded-xl mb-4 ${result.success ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <p className={`font-medium ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
              {result.success ? '✅' : '⚠️'} {result.message}
            </p>
            {result.leftover && (
              <div className="mt-2 text-sm text-gray-700">
                <p><strong>ID:</strong> {result.leftover.qrId}</p>
                <p><strong>Материал:</strong> {result.leftover.materialName}</p>
                <p><strong>Размер:</strong> {result.leftover.length} × {result.leftover.width} мм</p>
              </div>
            )}
            <button
              onClick={() => setResult(null)}
              className="mt-3 text-sm text-blue-600 font-medium"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Быстрые действия */}
        {!showManualForm && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/mobile-scan')}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-medium text-lg shadow"
            >
              📷 Сканировать камерой
            </button>

            <button
              onClick={() => setShowManualForm(true)}
              className="w-full py-4 bg-white border-2 border-primary-600 text-primary-600 rounded-xl font-medium text-lg shadow"
            >
              ➕ Добавить вручную
            </button>

            <button
              onClick={() => router.push('/leftovers')}
              className="w-full py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium shadow"
            >
              📋查看所有 остатки
            </button>
          </div>
        )}

        {/* Форма ручного добавления */}
        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ручное добавление</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID *</label>
              <input
                type="text"
                value={formData.qrId}
                onChange={e => setFormData({ ...formData, qrId: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
                placeholder="OST-2026-0001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Заказ *</label>
              <input
                type="text"
                value={formData.orderNumber}
                onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
                placeholder="2458"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Материал *</label>
              <select
                value={formData.materialType}
                onChange={e => setFormData({ ...formData, materialType: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
              >
                <option value="ЛДСП">ЛДСП</option>
                <option value="МДФ">МДФ</option>
                <option value="Столешница">Столешница</option>
                <option value="Кромка">Кромка</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
              <input
                type="text"
                value={formData.materialName}
                onChange={e => setFormData({ ...formData, materialName: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
                placeholder="Egger U708"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цвет *</label>
              <input
                type="text"
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
                placeholder="Серый"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Длина *</label>
                <input
                  type="number"
                  value={formData.length}
                  onChange={e => setFormData({ ...formData, length: e.target.value })}
                  className="w-full px-3 py-3 border rounded-lg text-lg"
                  placeholder="1200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ширина *</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={e => setFormData({ ...formData, width: e.target.value })}
                  className="w-full px-3 py-3 border rounded-lg text-lg"
                  placeholder="450"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Толщина *</label>
                <input
                  type="number"
                  value={formData.thickness}
                  onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                  className="w-full px-3 py-3 border rounded-lg text-lg"
                  placeholder="16"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Количество *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-lg"
                placeholder="1"
                min="1"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? '...' : 'Добавить'}
              </button>
            </div>
          </form>
        )}

        {/* Ввод JSON для сканирования */}
        {!showManualForm && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Или вставьте JSON из QR-кода:</h3>
            <form onSubmit={handleScanSubmit} className="space-y-2">
              <textarea
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={4}
                placeholder='{"id": "OST-...", ...}'
              />
              <button
                type="submit"
                className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm"
              >
                Обработать JSON
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Нижняя навигация */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <button
            onClick={() => { setShowManualForm(false); router.push('/mobile-scan'); }}
            className="flex-1 py-3 text-center text-sm text-gray-700"
          >
            📷 Scan
          </button>
          <button
            onClick={() => { setShowManualForm(true); }}
            className="flex-1 py-3 text-center text-sm text-gray-700"
          >
            ➕ Add
          </button>
          <button
            onClick={() => router.push('/leftovers')}
            className="flex-1 py-3 text-center text-sm text-gray-700"
          >
            📋 List
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-3 text-center text-sm text-red-600"
          >
            🚪 Exit
          </button>
        </div>
      </nav>
    </div>
  )
}
