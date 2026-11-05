import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount, compressPDF } from '../../services/pdfService'
import { CompressLevel } from '../../types'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Minimize2,
  FileText,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export const CompressView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [level, setLevel] = useState<CompressLevel>('balanced')

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [compressedData, setCompressedData] = useState<Uint8Array | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setCompressedData(null)
    setStatusMessage(null)
    setProgress(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err) {
      console.error('Error loading PDF for compression:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleCompress = async () => {
    if (!file) return

    setIsProcessing(true)
    setStatusMessage(null)
    setCompressedData(null)

    try {
      const resultBytes = await compressPDF(file.data, level, (cur, tot) => {
        setProgress({ current: cur, total: tot })
      })

      setCompressedData(resultBytes)
      const savedPercent = Math.max(0, Math.round((1 - resultBytes.byteLength / file.size) * 100))

      setStatusMessage({
        type: 'success',
        text: `Berhasil mengompres! Ukuran berkas berkurang ${savedPercent}%.`
      })
    } catch (err: any) {
      console.error('Compression error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengompres PDF.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveCompressed = async () => {
    if (!file || !compressedData) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_compressed.pdf`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        await window.electronAPI.writeFile(saveRes.filePath, compressedData)
      }
    } else {
      const blob = new Blob([compressedData as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-4xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.compressTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.compressSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setCompressedData(null)
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
            {/* File Info Card */}
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
                    Ukuran Asli: <strong className="text-zinc-700 dark:text-zinc-300">{formatSize(file.size)}</strong> • {pageCount} halaman
                  </p>
                </div>
              </div>
            </div>

            {/* Compression Level Selector */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-2.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                {t.selectCompressLevel}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLevel('extreme')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    level === 'extreme'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-850 shadow-2xs ring-1 ring-zinc-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {t.presetExtreme.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">~60-80%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {t.presetExtremeDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('balanced')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    level === 'balanced'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-850 shadow-2xs ring-1 ring-zinc-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {t.presetBalanced.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">~40-60%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {t.presetBalancedDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('light')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    level === 'light'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-850 shadow-2xs ring-1 ring-zinc-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {t.presetHigh}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">~20-35%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {t.presetHighDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>Mengompres lembar dokumen...</span>
                  <span>{progress.current} / {progress.total} halaman</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Result Comparison Card */}
            {compressedData && (
              <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[10px] font-mono text-zinc-400 uppercase">{t.originalSize}</p>
                      <p className="text-sm font-mono font-bold text-zinc-500 line-through">
                        {formatSize(file.size)}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-zinc-400" />

                    <div>
                      <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
                        {t.newSize}
                      </p>
                      <p className="text-base font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatSize(compressedData.byteLength)}
                      </p>
                    </div>
                  </div>

                  <div className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold">
                    -{Math.max(0, Math.round((1 - compressedData.byteLength / file.size) * 100))}%
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={handleSaveCompressed}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.saveCompressed}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      {file && !compressedData && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.compressBtn}...</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{t.compressBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
