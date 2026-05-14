'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import StatusBadge from '@/components/StatusBadge'
import { Leftover, LeftoverStatus } from '@/lib/types'

export default function MobileScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    leftover?: Leftover
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const scannerRef = useRef<any>(null)

  const getHtml5Qrcode = async () => {
    const module = await import('html5-qrcode')
    return module.Html5Qrcode
  }

  // Запрос разрешения на камеру
  useEffect(() => {
    requestCameraPermission()

    return () => {
      scannerRef.current?.stop?.().catch(() => {})
      scannerRef.current = null
    }
  }, [])

  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasPermission(false)
        setCameraError('Браузер не поддерживает доступ к камере. Откройте ссылку в Safari или Chrome.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Тыловая камера
      })

      // Останавливаем поток сразу после получения разрешения
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)

      // Загружаем список камер после получения разрешения
      await loadCameras()
    } catch (error) {
      console.error('Camera permission error:', error)
      setHasPermission(false)
      setCameraError('Нет доступа к камере. Разрешите доступ в настройках браузера.')
    }
  }

  const loadCameras = async () => {
    try {
      const Html5Qrcode = await getHtml5Qrcode()
      const cameras = await Html5Qrcode.getCameras()
      console.log('Available cameras:', cameras)

      const cameraList = cameras.map(c => ({
        id: c.id,
        label: c.label || `Camera ${cameras.indexOf(c) + 1}`
      }))

      setCameras(cameraList)

      // Выбираем тыловую камеру по умолчанию
      const backCamera = cameraList.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      )

      if (backCamera) {
        setSelectedCamera(backCamera.id)
      } else if (cameraList.length > 0) {
        setSelectedCamera(cameraList[0].id)
      }
    } catch (error) {
      console.error('Error loading cameras:', error)
      setCameraError('Не удалось получить список камер')
    }
  }

  const startScanning = async () => {
    if (!selectedCamera) {
      setCameraError('Выберите камеру')
      return
    }

    setCameraError('')
    setLoading(true)
    setResult(null)

    try {
      // Останавливаем предыдущий сканер если есть
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }

      const Html5Qrcode = await getHtml5Qrcode()
      const scanner = new Html5Qrcode('reader')
      scannerRef.current = scanner

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        onScanSuccess,
        onScanError
      )

      setScanning(true)
    } catch (error: any) {
      console.error('Error starting scanner:', error)
      setCameraError(error.message || 'Ошибка запуска сканера')
    } finally {
      setLoading(false)
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    console.log('QR Code detected:', decodedText)

    // Останавливаем сканирование после успешного считывания
    await scannerRef.current?.stop().catch(() => {})
    scannerRef.current = null
    setScanning(false)

    // Обрабатываем результат
    await processQRCode(decodedText)
  }

  const onScanError = (error: any) => {
    // Игнорируем ошибки сканирования (когда код не найден в кадре)
    if (error?.name !== 'NotFoundException') {
      console.warn('Scan error:', error)
    }
  }

  const stopScanning = async () => {
    await scannerRef.current?.stop().catch(() => {})
    scannerRef.current = null
    setScanning(false)
  }

  const parseQRData = (qrString: string): any => {
    try {
      const parsed = JSON.parse(qrString)
      if (parsed.id && parsed.orderNumber && parsed.materialType) {
        return parsed
      }
    } catch {
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

  const processQRCode = async (qrString: string) => {
    const qrData = parseQRData(qrString)

    if (!qrData) {
      setResult({
        success: false,
        message: 'Неверный формат QR-кода',
        error: 'invalid_format',
      })
      return
    }

    setLoading(true)

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
    } catch (error) {
      console.error('Network error:', error)
      setResult({
        success: false,
        message: 'Ошибка подключения к серверу',
        error: 'network_error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScanAgain = () => {
    setResult(null)
    startScanning()
  }

  const getStatusLabel = (status: LeftoverStatus | string) => {
    const labels: Record<string, string> = {
      AVAILABLE: 'В наличии',
      RESERVED: 'Зарезервирован',
      USED: 'Использован',
      SCRAPPED: 'Списан',
      DELETED: 'Удален',
    }
    return labels[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              📱 Мобильное сканирование
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Наведите камеру на QR-код
            </p>

            {/* Проверка разрешения */}
            {hasPermission === false && (
              <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg mb-4 text-center">
                <p className="font-medium mb-2">Нет доступа к камере</p>
                <p className="text-sm">
                  Разрешите доступ к камере в настройках браузера и обновите страницу
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                >
                  Обновить страницу
                </button>
              </div>
            )}

            {/* Выбор камеры */}
            {!scanning && cameras.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Камера
                </label>
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  {cameras.map(camera => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Область сканера */}
            {!result && (
              <div className="space-y-4">
                <div
                  id="reader"
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden"
                  style={{ minHeight: scanning ? '300px' : '200px' }}
                >
                  {!scanning && (
                    <div className="h-full flex items-center justify-center py-20">
                      <div className="text-center">
                        <span className="text-6xl mb-4 block">📷</span>
                        {hasPermission === null && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Запрос доступа к камере...
                          </p>
                        )}
                        {hasPermission === true && cameras.length === 0 && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Камеры не найдены
                          </p>
                        )}
                        {hasPermission === true && cameras.length > 0 && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Нажмите &quot;Начать сканирование&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-center">
                    {cameraError}
                  </div>
                )}

                {hasPermission === true && (
                  <button
                    onClick={scanning ? stopScanning : startScanning}
                    disabled={loading || cameras.length === 0}
                    className={`w-full py-4 px-6 text-xl font-medium rounded-xl transition-colors ${
                      scanning
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading
                      ? 'Загрузка...'
                      : scanning
                      ? 'Остановить'
                      : 'Начать сканирование'}
                  </button>
                )}
              </div>
            )}

            {/* Результат */}
            {result && (
              <div
                className={`p-6 rounded-xl ${
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

                    <button
                      onClick={handleScanAgain}
                      className="mt-4 w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Сканировать еще
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Инструкция */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Как использовать
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                  1
                </span>
                <span>Разрешите доступ к камере</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                  2
                </span>
                <span>Выберите камеру (тыловую)</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                  3
                </span>
                <span>Нажмите &quot;Начать сканирование&quot;</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                  4
                </span>
                <span>Наведите камеру на QR-код остатка</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm mr-3">
                  5
                </span>
                <span>Данные автоматически попадут в базу</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  )
}
