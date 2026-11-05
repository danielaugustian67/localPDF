import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  FileImage,
  FileText,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  FolderDown
} from 'lucide-react'

interface ExtractedImage {
  pageNumber: number
  dataUrl: string
  name: string
  size: number
}

export const PdfToImageView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [dpi, setDpi] = useState<number>(1.6) // 1.6 = ~150 DPI, 2.4 = ~250 DPI

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [results, setResults] = useState<ExtractedImage[]>([])
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setResults([])
    setStatusMessage(null)
    setProgress(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err) {
      console.error('Error loading PDF for image extraction:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const handleExtract = async () => {
    if (!file) return

    setIsProcessing(true)
    setStatusMessage(null)
    setResults([])

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: file.data.slice(0)
      })
      const pdf = await loadingTask.promise
      const total = pdf.numPages
      const images: ExtractedImage[] = []

      const cleanBaseName = file.name.replace(/\.pdf$/i, '')
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
      const ext = format === 'png' ? 'png' : 'jpg'

      for (let i = 1; i <= total; i++) {
        setProgress({ current: i, total })
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: dpi })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = viewport.width
          canvas.height = viewport.height

          // Selalu isi latar belakang kertas putih
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          await page.render({
            canvasContext: ctx,
            viewport
          }).promise

          const dataUrl = canvas.toDataURL(mimeType, 0.9)
          images.push({
            pageNumber: i,
            dataUrl,
            name: `${cleanBaseName}_halaman_${i}.${ext}`,
            size: Math.round((dataUrl.length * 3) / 4)
          })
        }
      }

      setResults(images)
      setStatusMessage({
        type: 'success',
        text: `Berhasil mengekstrak ${images.length} halaman menjadi gambar ${format.toUpperCase()}.`
      })
    } catch (err: any) {
      console.error('Extraction error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengekstrak gambar.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = (img: ExtractedImage) => {
    const a = document.createElement('a')
    a.href = img.dataUrl
    a.download = img.name
    a.click()
  }

  const downloadAll = () => {
    results.forEach((img, idx) => {
      setTimeout(() => {
        downloadImage(img)
      }, idx * 150)
    })
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileImage className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.pdfToImgTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.pdfToImgSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setResults([])
              setProgress(null)
            }}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t.changeFile}
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="font-mono text-[11px]">{statusMessage.text}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
        {!file ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-md">
              <DropZone
                onFilesSelected={handleFileSelected}
                multiple={false}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {pageCount} total halaman
                  </p>
                </div>
              </div>
            </div>

            {/* Extraction Settings */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs text-xs">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {t.imageFormat}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={`py-1.5 px-3 rounded-md border font-mono text-xs transition-all ${
                      format === 'png'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('jpeg')}
                    className={`py-1.5 px-3 rounded-md border font-mono text-xs transition-all ${
                      format === 'jpeg'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    JPG
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {t.resolution}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDpi(1.6)}
                    className={`py-1.5 px-3 rounded-md border font-mono text-xs transition-all ${
                      dpi === 1.6
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.standardDpi}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpi(2.4)}
                    className={`py-1.5 px-3 rounded-md border font-mono text-xs transition-all ${
                      dpi === 2.4
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.highDpi}
                  </button>
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>Mengekstrak halaman ke gambar...</span>
                  <span>{progress.current} / {progress.total} lembar</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Extracted Images Grid */}
            {results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FolderDown className="w-3.5 h-3.5" />
                    {t.imageResults} ({results.length})
                  </span>
                  <button
                    onClick={downloadAll}
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 underline font-mono"
                  >
                    {t.downloadAll}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {results.map((img) => (
                    <div
                      key={img.pageNumber}
                      className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-2xs"
                    >
                      <div className="w-full aspect-[1/1.414] bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-contain" />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-zinc-500">
                          Hal #{img.pageNumber}
                        </span>

                        <button
                          onClick={() => downloadImage(img)}
                          title="Unduh gambar ini"
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {file && results.length === 0 && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            onClick={handleExtract}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.extractBtn}...</span>
              </>
            ) : (
              <>
                <FileImage className="w-3.5 h-3.5" />
                <span>{t.extractBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
