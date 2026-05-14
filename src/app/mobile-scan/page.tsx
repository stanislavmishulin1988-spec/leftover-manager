'use client'

import { useEffect, useRef, useState } from 'react'
import { Leftover } from '@/lib/types'

type ScanResult = {
  success: boolean
  message: string
  leftover?: Leftover
  error?: string
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>
}

export default function MobileScanPage() {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [manualInput, setManualInput] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)

  useEffect(() => {
    return () => stopScanning()
  }, [])

  const stopScanning = () => {
    if (scanLoopRef.current) {
      window.clearTimeout(scanLoopRef.current)
      scanLoopRef.current = null
    }

    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setScanning(false)
  }

  const parseQRData = (qrString: string): any => {
    try {
      const parsed = JSON.parse(qrString)
      if (parsed.id && parsed.orderNumber && parsed.materialType) return parsed
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
          quantity: parseInt(parts[8], 10),
          createdAt: parts[9],
          comment: parts[10] || '',
        }
      }
    }
    return null
  }

  const processQRCode = async (qrString: string) => {
    const qrData = parseQRData(qrString.trim())

    if (!qrData) {
      setResult({
        success: false,
        message: 'Неверный формат QR-кода',
        error: 'invalid_format',
      })
      return
    }

    stopScanning()
    setLoading(true)

    try {
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: 'Остаток успешно добавлен!', leftover: data.leftover })
        setManualInput('')
      } else if (data.error === 'duplicate') {
        setResult({
          success: false,
          message: 'Этот QR-код уже есть в базе',
          leftover: data.leftover,
          error: 'duplicate',
        })
      } else {
        setResult({ success: false, message: data.error || 'Ошибка добавления', error: 'api_error' })
      }
    } catch {
      setResult({ success: false, message: 'Ошибка подключения к серверу', error: 'network_error' })
    } finally {
      setLoading(false)
    }
  }

  const scanFrame = async (detector: InstanceType<BarcodeDetectorConstructor>) => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !streamRef.current) return

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')

      if (context && canvas.width > 0 && canvas.height > 0) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const codes = await detector.detect(canvas)
        const decodedText = codes[0]?.rawValue

        if (decodedText) {
          await processQRCode(decodedText)
          return
        }
      }
    }

    scanLoopRef.current = window.setTimeout(() => scanFrame(detector), 250)
  }

  const startScanning = async () => {
    setCameraError('')
    setResult(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Этот браузер не поддерживает доступ к камере. Откройте ссылку в Safari или Chrome.')
      return
    }

    const BarcodeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!BarcodeDetector) {
      setCameraError('Этот браузер не поддерживает сканирование QR камерой. Вставьте данные QR-кода в поле ниже.')
      return
    }

    setLoading(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      setScanning(true)
      scanFrame(detector)
    } catch (error: any) {
      console.error('Camera start error:', error)
      setCameraError(error?.message || 'Не удалось запустить камеру. Проверьте разрешение на доступ.')
      stopScanning()
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (manualInput.trim()) processQRCode(manualInput)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <a
            href="/mobile"
            className="mb-4 inline-block text-sm font-medium text-primary-600 dark:text-primary-400"
          >
            ← Назад
          </a>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Мобильное сканирование
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Наведите камеру на QR-код
            </p>
            <p className="text-center text-xs text-gray-400 mb-4">
              Версия сканера: native-2
            </p>

            {!result && (
              <div className="space-y-4">
                <div className="w-full bg-black rounded-xl overflow-hidden aspect-square flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`h-full w-full object-cover ${scanning ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                  />
                  {!scanning && (
                    <div className="text-center px-6">
                      <span className="text-6xl mb-4 block">📷</span>
                      <p className="text-gray-300">
                        Нажмите кнопку ниже, чтобы включить камеру
                      </p>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {cameraError && (
                  <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-center">
                    {cameraError}
                  </div>
                )}

                <button
                  onClick={scanning ? stopScanning : startScanning}
                  disabled={loading}
                  className={`w-full py-4 px-6 text-xl font-medium rounded-xl transition-colors ${
                    scanning
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Загрузка...' : scanning ? 'Остановить' : 'Начать сканирование'}
                </button>
              </div>
            )}

            {result && (
              <div className={`p-6 rounded-xl ${result.success ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                <p className={`text-lg font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {result.message}
                </p>

                {result.leftover && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">ID:</span>
                        <span className="ml-2 font-medium dark:text-white">{result.leftover.qrId}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Материал:</span>
                        <span className="ml-2 font-medium dark:text-white">{result.leftover.materialName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Размер:</span>
                        <span className="ml-2 font-medium dark:text-white">
                          {result.leftover.length} × {result.leftover.width} мм
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Статус:</span>
                        <span className="ml-2 font-medium dark:text-white">{result.leftover.status}</span>
                      </div>
                    </div>
                    <a
                      href={`/leftovers/${result.leftover.id}`}
                      className="mt-3 inline-block text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      Подробнее →
                    </a>
                  </div>
                )}

                <button
                  onClick={() => setResult(null)}
                  className="mt-4 w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  Сканировать еще
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Ручной ввод QR
            </h2>
            <textarea
              value={manualInput}
              onChange={event => setManualInput(event.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder='{"id":"OST-2026-0001",...}'
            />
            <button
              type="submit"
              disabled={loading || !manualInput.trim()}
              className="mt-4 w-full py-3 px-6 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Обработать QR
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
