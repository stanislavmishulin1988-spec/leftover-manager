'use client'

export default function MobileScanError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-3 text-xl font-bold text-gray-900">
          Ошибка мобильного сканера
        </h1>
        <p className="mb-4 text-gray-700">
          Страница камеры не запустилась в этом браузере. Откройте ссылку в Safari или Chrome.
        </p>
        <pre className="mb-4 max-h-40 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
          {error.message || 'Client-side error'}
        </pre>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-3 font-medium text-white"
          >
            Повторить
          </button>
          <a
            href="/mobile"
            className="flex-1 rounded-lg bg-gray-200 px-4 py-3 text-center font-medium text-gray-900"
          >
            Назад
          </a>
        </div>
      </div>
    </div>
  )
}
