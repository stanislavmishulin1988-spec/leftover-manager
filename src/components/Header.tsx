'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  username: string
  role: string
}

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Not authenticated')
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const navLinks = [
    { href: '/scan', label: 'Сканирование', icon: '📷' },
    { href: '/mobile-scan', label: 'Мобильное', icon: '📱' },
    { href: '/add', label: 'Добавить', icon: '➕' },
    { href: '/leftovers', label: 'База', icon: '📋' },
    { href: '/reports', label: 'Отчеты', icon: '📊' },
  ]

  if (loading) return null

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🏭</span>
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              Учет остатков
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              v1.0.15
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-800 dark:text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role === 'ADMIN' && 'Администратор'}
                    {user.role === 'OPERATOR' && 'Оператор'}
                    {user.role === 'MASTER' && 'Мастер'}
                    {user.role === 'MANAGER' && 'Менеджер'}
                    {user.role === 'TECHNOLOGIST' && 'Технолог'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Выход
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Мобильное меню */}
        <nav className="md:hidden flex overflow-x-auto mt-3 pb-2 space-x-2">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-shrink-0 px-4 py-2 rounded-lg transition-colors text-sm ${
                pathname === link.href
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
