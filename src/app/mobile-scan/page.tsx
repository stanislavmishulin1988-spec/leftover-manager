'use client'

import { useEffect, useRef, useState } from 'react'
import { Leftover } from '@/lib/types'
import { parseUniversalQR } from '@/lib/qr'

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
  const [scannerMode, setScannerMode] = useState<'native' | 'html5' | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const scannerRef = useRef<any>(null)
  const processingRef = useRef(false)
  const startingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      void stopScanning()
    }
  }, [])

  const stopScanning = async () => {
    if (scanLoopRef.current) {
      window.clearTimeout(scanLoopRef.current)
      scanLoopRef.current = null
    }

    if (startingTimeoutRef.current) {
      window.clearTimeout(startingTimeoutRef.current)
      startingTimeoutRef.current = null
    }

    setScanning(false)
    setLoading(false)
    setScannerMode(null)

    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null

    const scanner = scannerRef.current
    scannerRef.current = null

    try {
      if (scanner?.isScanning) {
        await scanner.stop()
      } else {
        await scanner?.stop?.()
      }
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner?.clear?.()
    } catch {
      // The reader element may already be cleared.
    }
  }

  const processQRCode = async (qrString: string) => {
    if (processingRef.current) return
    processingRef.current = true

    const qrData = parseUniversalQR(qrString)

    if (!qrString.trim()) {
      setResult({
        success: false,
        message: 'QR-код пустой',
        error: 'empty',
      })
      processingRef.current = false
      return
    }

    await stopScanning()
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
      processingRef.current = false
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
    processingRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Этот браузер не поддерживает доступ к камере. Откройте ссылку в Safari или Chrome.')
      return
    }

    const BarcodeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!BarcodeDetector) {
      await startHtml5Scanner()
      return
    }

    setLoading(true)

    try {
      setScannerMode('native')
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
      await stopScanning()
    } finally {
      setLoading(false)
    }
  }

  const startHtml5Scanner = async () => {
    setLoading(true)
    setCameraError('')
    processingRef.current = false

    startingTimeoutRef.current = window.setTimeout(() => {
      setCameraError('Камера запускается слишком долго. Нажмите "Сбросить камеру" и попробуйте еще раз.')
      void stopScanning()
    }, 10000)

    try {
      const module = await import('html5-qrcode')
      const scanner = new module.Html5Qrcode('reader')
      scannerRef.current = scanner
      setScannerMode('html5')
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 5,
          qrbox: { width: 220, height: 220 },
          disableFlip: false,
        },
        async (decodedText: string) => {
          await processQRCode(decodedText)
        },
        () => {}
      )

      if (startingTimeoutRef.current) {
        window.clearTimeout(startingTimeoutRef.current)
        startingTimeoutRef.current = null
      }
    } catch (error: any) {
      console.error('HTML5 QR scanner error:', error)
      setCameraError(error?.message || 'Не удалось запустить QR-сканер. Проверьте разрешение на камеру.')
      await stopScanning()
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
              Версия сканера: caret-8
            </p>

            {!result && (
              <div className="space-y-4">
                <div className="w-full bg-black rounded-xl overflow-hidden aspect-square flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`h-full w-full object-cover ${scanning && scannerMode === 'native' ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                  />
                  <div
                    id="reader"
                    className={`h-full w-full ${scanning && scannerMode === 'html5' ? 'block' : 'hidden'}`}
                  />
                  {!scanning && !scannerMode && (
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
                  onClick={() => {
                    if (scanning) {
                      void stopScanning()
                    } else {
                      void startScanning()
                    }
                  }}
                  disabled={loading}
                  className={`w-full py-4 px-6 text-xl font-medium rounded-xl transition-colors ${
                    scanning
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Загрузка...' : scanning ? 'Остановить' : 'Начать сканирование'}
                </button>
                {(scanning || scannerMode || cameraError) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError('')
                      void stopScanning()
                    }}
                    className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-xl transition-colors"
                  >
                    Сбросить камеру
                  </button>
                )}
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
