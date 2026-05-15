'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { User, Role } from '@/lib/types'

interface NewUser {
  name: string
  username: string
  password: string
  role: Role
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    username: '',
    password: '',
    role: 'OPERATOR',
  })

  useEffect(() => {
    loadUsers()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      if (res.ok) {
        setNewUser({ name: '', username: '', password: '', role: 'OPERATOR' })
        setShowAddUser(false)
        loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка добавления пользователя')
      }
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Ошибка подключения к серверу')
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    setBackupMessage('')

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setBackupMessage(`✅ Резервная копия создана: ${data.filename}`)

        // Скачивание файла
        const downloadRes = await fetch(`/api/backup/download?filename=${data.filename}`)
        if (downloadRes.ok) {
          const blob = await downloadRes.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.filename
          a.click()
          window.URL.revokeObjectURL(url)
        }
      } else {
        const data = await res.json()
        setBackupMessage(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Backup error:', error)
      setBackupMessage('❌ Ошибка создания резервной копии')
    } finally {
      setBackupLoading(false)
    }
  }

  const getRoleLabel = (role: Role | string) => {
    const labels: Record<Role, string> = {
      ADMIN: 'Администратор',
      OPERATOR: 'Оператор',
      MASTER: 'Мастер',
      MANAGER: 'Менеджер',
      TECHNOLOGIST: 'Технолог',
    }
    return labels[role as Role] ?? role
  }

  const getRoleBadgeColor = (role: Role | string) => {
    const colors: Record<Role, string> = {
      ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      MASTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      OPERATOR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      TECHNOLOGIST: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    }
    return colors[role as Role] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            ⚙️ Настройки
          </h1>

          {/* Резервное копирование */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Резервное копирование
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Создайте резервную копию базы данных для сохранения всех данных.
            </p>
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {backupLoading ? 'Создание...' : '💾 Создать резервную копию'}
            </button>
            {backupMessage && (
              <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{backupMessage}</p>
            )}
          </div>

          {/* Пользователи */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                Пользователи
              </h2>
              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                >
                  ➕ Добавить
                </button>
              )}
            </div>

            {showAddUser && (
              <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Логин
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Пароль
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white text-sm"
                      required
                      minLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Роль
                    </label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white text-sm"
                    >
                      <option value="OPERATOR">Оператор</option>
                      <option value="MASTER">Мастер</option>
                      <option value="MANAGER">Менеджер</option>
                      <option value="TECHNOLOGIST">Технолог</option>
                      <option value="ADMIN">Администратор</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white text-sm rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Загрузка...
              </p>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        @{user.username}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role as Role)}`}>
                        {getRoleLabel(user.role as Role)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Информация о приложении */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              О приложении
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div><strong>Версия:</strong> 1.0.18</div>
              <div><strong>База данных:</strong> PostgreSQL / Neon</div>
              <div><strong>Дата сборки:</strong> {new Date().toLocaleDateString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
