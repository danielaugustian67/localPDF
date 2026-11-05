import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { renderAllThumbnails } from '../../services/pdfThumbnail'
import { getPageCount, splitPDFByRanges, splitPDFEveryNPages, splitAllPages } from '../../services/pdfService'
import { SplitMode, SplitResultFile } from '../../types'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Split,
  FileText,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  FolderDown,
  Loader2
} from 'lucide-react'

export const SplitView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
    path?: string
  } | null>(null)
  const [pageCount, setPageCount] = useState<number>(0)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [loadingThumbnails, setLoadingThumbnails] = useState(false)

  const [mode, setMode] = useState<SplitMode>('range')
  const [rangeInput, setRangeInput] = useState<string>('1-2, 3-4')
  const [everyN, setEveryN] = useState<number>(2)

  const [isProcessing, setIsProcessing] = useState(false)
  const [splitResults, setSplitResults] = useState<SplitResultFile[]>([])
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setSplitResults([])
    setStatusMessage(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
      setRangeInput(`1-${Math.min(2, count)}, ${Math.min(3, count)}-${count}`)

      setLoadingThumbnails(true)
      const thumbs = await renderAllThumbnails(target.data, 0.25)
      setThumbnails(thumbs)
      setLoadingThumbnails(false)
    } catch (err) {
      console.error('Error loading PDF for split:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca dokumen PDF.' })
    }
  }

  const parseRanges = (str: string, max: number): { start: number; end: number }[] => {
    const parts = str.split(',').map((p) => p.trim()).filter(Boolean)
    const ranges: { start: number; end: number }[] = []

    for (const part of parts) {
      if (part.includes('-')) {
        const [s, e] = part.split('-').map((v) => parseInt(v.trim(), 10))
        if (!isNaN(s) && !isNaN(e) && s >= 1 && e <= max && s <= e) {
          ranges.push({ start: s, end: e })
        }
      } else {
        const val = parseInt(part, 10)
        if (!isNaN(val) && val >= 1 && val <= max) {
          ranges.push({ start: val, end: val })
        }
      }
    }
    return ranges
  }

  const handleSplit = async () => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)
    setSplitResults([])

    try {
      let results: SplitResultFile[] = []

      if (mode === 'range') {
        const parsed = parseRanges(rangeInput, pageCount)
        if (parsed.length === 0) {
          throw new Error('Format rentang halaman tidak valid. Contoh: 1-3, 5, 7-10')
        }
        results = await splitPDFByRanges(file.data, parsed, file.name)
      } else if (mode === 'every-n') {
        if (everyN < 1) throw new Error('Jumlah halaman per berkas minimal 1.')
        results = await splitPDFEveryNPages(file.data, everyN, file.name)
      } else if (mode === 'all') {
        results = await splitAllPages(file.data, file.name)
      }

      setSplitResults(results)
      setStatusMessage({
        type: 'success',
        text: `Berhasil memisahkan PDF menjadi ${results.length} berkas.`
      })
    } catch (err: any) {
      console.error('Split error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memisahkan PDF.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const saveSingleResult = async (item: SplitResultFile) => {
    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(item.name)
      if (!saveRes.canceled && saveRes.filePath) {
        await window.electronAPI.writeFile(saveRes.filePath, item.data)
      }
    } else {
      const blob = new Blob([item.data as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
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
            <Split className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.splitTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.splitSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setSplitResults([])
              setThumbnails([])
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

      {/* Content */}
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
                    {pageCount} total halaman • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* Segmented Control Mode Selection */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                  {t.splitMode}
                </span>
              </div>

              {/* Native Segmented Bar */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setMode('range')}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    mode === 'range'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {t.splitRange}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('every-n')}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    mode === 'every-n'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {t.splitEveryN}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('all')}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    mode === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {t.splitAll}
                </button>
              </div>

              {/* Mode Inputs */}
              {mode === 'range' && (
                <div className="pt-1">
                  <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 font-mono">
                    {t.splitRangeHint} (1–{pageCount})
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="1-2, 3, 4-5"
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              )}

              {mode === 'every-n' && (
                <div className="pt-1 flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {t.splitEveryNHint}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={everyN}
                    onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-mono text-center font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <span className="text-[11px] text-zinc-500 font-mono">
                    (~{Math.ceil(pageCount / (everyN || 1))})
                  </span>
                </div>
              )}

              {mode === 'all' && (
                <div className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {t.splitAllHint}
                </div>
              )}
            </div>

            {/* Horizontal thumbnail carousel */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                {t.pagePreview} ({thumbnails.length}/{pageCount})
              </span>

              {loadingThumbnails ? (
                <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Merender pratinjau lembar...</span>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 pt-0.5">
                  {thumbnails.map((thumb, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-16 flex flex-col items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-2xs"
                    >
                      <div className="w-full h-20 bg-zinc-100 dark:bg-zinc-800 rounded-sm overflow-hidden flex items-center justify-center">
                        {thumb ? (
                          <img src={thumb} alt={`Hal ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400">{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono font-medium text-zinc-500 mt-1">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Result files list */}
            {splitResults.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <FolderDown className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span>{t.splitResults} ({splitResults.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {splitResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-850 border border-zinc-200/70 dark:border-zinc-700/70 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate text-[11px]">
                          {item.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          {item.pageDescription} • {(item.data.byteLength / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <button
                        onClick={() => saveSingleResult(item)}
                        title="Simpan berkas ini"
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {file && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            onClick={handleSplit}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.splitBtn}...</span>
              </>
            ) : (
              <>
                <Split className="w-3.5 h-3.5" />
                <span>{t.splitBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
