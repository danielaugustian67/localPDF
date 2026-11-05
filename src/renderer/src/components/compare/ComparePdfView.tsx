import React, { useState, useEffect } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import { comparePdfPages, ComparePageResult } from '../../services/compareService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  GitCompare,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  SplitSquareVertical,
  Layers,
  FileCheck2
} from 'lucide-react'

export const ComparePdfView: React.FC = () => {
  const { t } = useTranslation()
  const [fileA, setFileA] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [fileB, setFileB] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [maxPages, setMaxPages] = useState<number>(1)
  const [isComparing, setIsComparing] = useState(false)
  const [compareResult, setCompareResult] = useState<ComparePageResult | null>(null)
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side'>('overlay')
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  const handleFileASelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    setFileA(files[0])
    setCompareResult(null)
    const countA = await getPageCount(files[0].data)
    if (fileB) {
      const countB = await getPageCount(fileB.data)
      setMaxPages(Math.max(countA, countB))
    } else {
      setMaxPages(countA)
    }
  }

  const handleFileBSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    setFileB(files[0])
    setCompareResult(null)
    const countB = await getPageCount(files[0].data)
    if (fileA) {
      const countA = await getPageCount(fileA.data)
      setMaxPages(Math.max(countA, countB))
    } else {
      setMaxPages(countB)
    }
  }

  // Trigger compare on page change or file ready
  useEffect(() => {
    if (!fileA || !fileB) return

    let isMounted = true
    const runCompare = async () => {
      setIsComparing(true)
      setStatusMessage(null)

      try {
        const res = await comparePdfPages(fileA.data, fileB.data, currentPage)
        if (isMounted) {
          setCompareResult(res)
          if (res.hasDifferences) {
            setStatusMessage({
              type: 'warning',
              text: `Halaman ${currentPage}: Ditemukan ${res.diffPixelPercent}% perbedaan visual antara draf dan revisi.`
            })
          } else {
            setStatusMessage({
              type: 'success',
              text: `Halaman ${currentPage}: ${t.identicalPages}`
            })
          }
        }
      } catch (err: any) {
        console.error('Compare error:', err)
        if (isMounted) {
          setStatusMessage({ type: 'error', text: 'Gagal membandingkan halaman.' })
        }
      } finally {
        if (isMounted) setIsComparing(false)
      }
    }

    runCompare()

    return () => {
      isMounted = false
    }
  }, [fileA, fileB, currentPage])

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-6xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            {t.comparePdfTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.comparePdfSubtitle}
          </p>
        </div>

        {(fileA || fileB) && (
          <button
            onClick={() => {
              setFileA(null)
              setFileB(null)
              setCompareResult(null)
              setCurrentPage(1)
              setStatusMessage(null)
            }}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t.reset}
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
              : statusMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : statusMessage.type === 'warning' ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="font-mono text-[11px]">{statusMessage.text}</span>
        </div>
      )}

      {/* Dual File Selection or Compare Workspace */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
        {!fileA || !fileB ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* File A DropZone */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                {t.dropDocA}
              </span>
              {fileA ? (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-center">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{fileA.name}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {(fileA.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <DropZone onFilesSelected={handleFileASelected} multiple={false} />
              )}
            </div>

            {/* File B DropZone */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                {t.dropDocB}
              </span>
              {fileB ? (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-center">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{fileB.name}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {(fileB.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <DropZone onFilesSelected={handleFileBSelected} multiple={false} />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Control Bar: Mode Toggle & Page Navigation */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('overlay')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'overlay'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t.diffOverlayTab}</span>
                </button>

                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'side-by-side'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>{t.sideBySideTab}</span>
                </button>
              </div>

              {/* Synchronized Page Flip Controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1 || isComparing}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-semibold px-2">
                  {t.pageNav} {currentPage} {t.ofPage} {maxPages}
                </span>
                <button
                  disabled={currentPage >= maxPages || isComparing}
                  onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Viewer Display */}
            {isComparing ? (
              <div className="h-96 flex flex-col items-center justify-center gap-2 text-zinc-400 font-mono text-xs">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Membandingkan perbedaan visual...</span>
              </div>
            ) : compareResult ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
                {viewMode === 'overlay' ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mb-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                      <span>Sorotan Merah = Area yang ditambahkan, dihapus, atau berubah</span>
                    </div>
                    <img
                      src={compareResult.diffDataUrl}
                      alt="Visual Diff"
                      className="max-h-[65vh] object-contain rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {fileA.name} (Halaman {currentPage})
                      </span>
                      <img
                        src={compareResult.dataUrlA}
                        alt="Doc A"
                        className="max-h-[60vh] object-contain rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {fileB.name} (Halaman {currentPage})
                      </span>
                      <img
                        src={compareResult.dataUrlB}
                        alt="Doc B"
                        className="max-h-[60vh] object-contain rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
