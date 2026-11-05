import React, { useState } from 'react'
import { NUpLayout } from '../../types'
import { DropZone } from '../common/DropZone'
import { getPageCount, generateNUpPDF } from '../../services/pdfService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Printer,
  FileCheck,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  Columns2
} from 'lucide-react'

export const NUpView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
    path?: string
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [layout, setLayout] = useState<NUpLayout>('2-up')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setStatusMessage(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err: any) {
      console.error('Error counting pages:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca dokumen PDF.' })
    }
  }

  // Calculate paper savings
  const pagesPerSheet = layout === '2-up' ? 2 : 4
  const resultingSheets = Math.ceil(pageCount / pagesPerSheet)
  const paperSavedPercent =
    pageCount > 0 ? Math.round(((pageCount - resultingSheets) / pageCount) * 100) : 0

  const handleProcessNUp = async () => {
    if (!file || pageCount === 0) return
    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const nupBytes = await generateNUpPDF(file.data, layout)
      const defaultSaveName = `${file.name.replace(/\.pdf$/i, '')}_${layout}.pdf`

      if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
        const saveRes = await window.electronAPI.saveFileDialog(defaultSaveName)
        if (!saveRes.canceled && saveRes.filePath) {
          const writeRes = await window.electronAPI.writeFile(saveRes.filePath, nupBytes)
          if (writeRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()} (${resultingSheets} lembar A4)`
            })
          } else {
            throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
          }
        }
      } else {
        const blob = new Blob([nupBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultSaveName
        a.click()
        URL.revokeObjectURL(url)
        setStatusMessage({
          type: 'success',
          text: `Berhasil mengunduh dokumen hemat kertas (${resultingSheets} lembar).`
        })
      }
    } catch (err: any) {
      console.error('N-Up error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyusun lembar dokumen.' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-4xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Printer className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.nupTitle}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.nupSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setPageCount(0)
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1">
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
            {/* File Info & Savings Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {file.name}
                </h4>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  Total dokumen asli: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{pageCount} Halaman</span> • {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              {/* Savings Badge */}
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 font-mono">
                  {t.paperSaved} {paperSavedPercent}% ({resultingSheets})
                </span>
              </div>
            </div>

            {/* Layout Options Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold pl-0.5">
                {t.selectLayout}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 2-Up Option */}
                <div
                  onClick={() => setLayout('2-up')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    layout === '2-up'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-xs ring-1 ring-zinc-900/10 dark:ring-zinc-100/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Columns2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.nup2Up}
                      </span>
                    </div>
                    {layout === '2-up' && (
                      <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {t.nup2UpDesc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] font-mono text-zinc-400">
                    {pageCount} ➔ {Math.ceil(pageCount / 2)}
                  </div>
                </div>

                {/* 4-Up Option */}
                <div
                  onClick={() => setLayout('4-up')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    layout === '4-up'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-xs ring-1 ring-zinc-900/10 dark:ring-zinc-100/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.nup4Up}
                      </span>
                    </div>
                    {layout === '4-up' && (
                      <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {t.nup4UpDesc}
                  </p>
                  <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] font-mono text-zinc-400">
                    {pageCount} ➔ {Math.ceil(pageCount / 4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                disabled={isProcessing}
                onClick={handleProcessNUp}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? `${t.nupBtn}...`
                    : `${t.nupBtn} (${resultingSheets})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
