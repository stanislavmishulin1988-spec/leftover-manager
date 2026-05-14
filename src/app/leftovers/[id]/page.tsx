'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover, History, LeftoverStatus } from '@/lib/types'

export default function LeftoverDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [leftover, setLeftover] = useState<Leftover | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<LeftoverStatus>('AVAILABLE')
  const [orderNumber, setOrderNumber] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    loadLeftover()
  }, [params.id])

  const loadLeftover = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leftovers/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setLeftover(data.leftover)
        setHistory(data.leftover.history || [])
      } else {
        router.push('/leftovers')
      }
    } catch (error) {
      console.error('Error loading leftover:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!leftover) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/leftovers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          orderNumber: (newStatus === 'RESERVED' || newStatus === 'USED') ? orderNumber : undefined,
          comment,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLeftover(data.leftover)
        setShowStatusModal(false)
        setOrderNumber('')
        setComment('')
        loadLeftover() // Reload to get updated history
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка обновления статуса')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Ошибка подключения к серверу')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!leftover) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/leftovers/${params.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/leftovers')
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка удаления')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Ошибка подключения к серверу')
    } finally {
      setActionLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      ADD: 'Добавлен',
      UPDATE_STATUS: 'Изменен статус',
      RESERVE: 'Зарезервирован',
      USE: 'Использован',
      DELETE: 'Удален',
      UPDATE: 'Обновлен',
    }
    return labels[actionType] || actionType
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!leftover) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600 dark:text-gray-400">Остаток не найден</p>
            <button
              onClick={() => router.push('/leftovers')}
              className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg"
            >
              Вернуться к списку
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Заголовок */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Карточка остатка
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{leftover.qrId}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setNewStatus(leftover.status as LeftoverStatus)
                  setShowStatusModal(true)
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Изменить статус
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Основная информация */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Информация
                  </h2>
                  <StatusBadge status={leftover.status as LeftoverStatus} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Материал
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.materialName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Вид
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.materialType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Цвет
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.color}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Толщина
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.thickness || '—'} мм</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Размеры
                    </h3>
                    <p className="text-gray-800 dark:text-white">
                      {leftover.length} × {leftover.width} мм
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Количество
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.quantity} шт.</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Номер заказа
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.orderNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Дата создания
                    </h3>
                    <p className="text-gray-800 dark:text-white">
                      {new Date(leftover.qrCreatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Добавил
                    </h3>
                    <p className="text-gray-800 dark:text-white">
                      {leftover.addedByUser?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Дата добавления
                    </h3>
                    <p className="text-gray-800 dark:text-white">
                      {new Date(leftover.addedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                {/* Статусы резервирования/использования */}
                {(leftover.reservedForOrder || leftover.usedForOrder) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    {leftover.reservedForOrder && (
                      <div className="mb-3">
                        <span className="text-sm text-gray-500">Зарезервирован для заказа:</span>
                        <span className="ml-2 font-medium text-gray-800 dark:text-white">
                          {leftover.reservedForOrder}
                        </span>
                      </div>
                    )}
                    {leftover.usedForOrder && (
                      <div>
                        <span className="text-sm text-gray-500">Использован в заказе:</span>
                        <span className="ml-2 font-medium text-gray-800 dark:text-white">
                          {leftover.usedForOrder}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Комментарий */}
                {leftover.comment && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Комментарий
                    </h3>
                    <p className="text-gray-800 dark:text-white">{leftover.comment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* История */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  История
                </h2>

                {history.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    История пуста
                  </p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {history.map(item => (
                      <div
                        key={item.id}
                        className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {getActionLabel(item.actionType)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {item.comment && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.comment}
                          </p>
                        )}
                        {item.user && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.user.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Модальное окно изменения статуса */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Изменить статус
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Новый статус
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as LeftoverStatus)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="AVAILABLE">В наличии</option>
                    <option value="RESERVED">Зарезервирован</option>
                    <option value="USED">Использован</option>
                    <option value="SCRAPPED">Списан</option>
                    <option value="DELETED">Удален</option>
                  </select>
                </div>

                {(newStatus === 'RESERVED' || newStatus === 'USED') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Номер заказа
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={e => setOrderNumber(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Например, 2458"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Комментарий
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Необязательно"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowStatusModal(false)
                    setNewStatus(leftover.status as LeftoverStatus)
                    setOrderNumber('')
                    setComment('')
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Подтверждение удаления */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <span className="text-5xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                Подтвердите удаление
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Остаток будет помечен как &laquo;Удален&raquo;, но останется в базе данных.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                ID: {leftover.qrId}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
