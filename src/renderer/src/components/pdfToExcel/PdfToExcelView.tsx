import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import { convertPDFToExcel, PDFToExcelResult } from '../../services/excelService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Table,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'

export const PdfToExcelView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<PDFToExcelResult | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setResult(null)
    setStatusMessage(null)
    setProgress(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err) {
      console.error('Error loading PDF for Excel:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const handleConvert = async () => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)
    setResult(null)

    try {
      const res = await convertPDFToExcel(file.data, (cur, tot) => {
        setProgress({ current: cur, total: tot })
      })

      setResult(res)
      setStatusMessage({
        type: 'success',
        text: `${t.excelSuccess}! (${res.totalRows} ${t.totalRows}, ${res.totalColumns} ${t.totalCols})`
      })
    } catch (err: any) {
      console.error('Excel conversion error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengekstrak tabel.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveXlsx = async () => {
    if (!file || !result) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}.xlsx`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(saveRes.filePath, result.xlsxBytes)
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([result.xlsxBytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSaveCsv = async () => {
    if (!file || !result) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}.csv`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const encoder = new TextEncoder()
        const writeRes = await window.electronAPI.writeFile(
          saveRes.filePath,
          encoder.encode(result.csvContent)
        )
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t.pdfToExcelTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.pdfToExcelSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setResult(null)
              setStatusMessage(null)
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
              <DropZone onFilesSelected={handleFileSelected} multiple={false} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Table className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {pageCount} total halaman • {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {!result && (
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengekstrak Tabel...</span>
                    </>
                  ) : (
                    <>
                      <Table className="w-3.5 h-3.5" />
                      <span>Ekstrak ke Spreadsheet</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>Menganalisis baris dan kolom tabel...</span>
                  <span>
                    {progress.current} / {progress.total} halaman
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Spreadsheet Preview & Download Options */}
            {result && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.tablePreview}
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-500">
                      {result.totalRows} {t.totalRows} • {result.totalColumns} {t.totalCols}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.exportCsvBtn}</span>
                    </button>
                    <button
                      onClick={handleSaveXlsx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{t.exportXlsxBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Table Data Render */}
                <div className="max-h-80 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <tbody>
                      {result.rows.slice(0, 100).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx === 0
                              ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold border-b border-zinc-200 dark:border-zinc-700'
                              : 'border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                          }
                        >
                          <td className="px-2 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800 select-none w-8 text-center">
                            {rIdx + 1}
                          </td>
                          {row.cells.map((c, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3 py-1.5 border-r border-zinc-100 dark:border-zinc-800/60 truncate max-w-xs"
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.rows.length > 100 && (
                  <p className="text-[10px] font-mono text-zinc-400 text-center">
                    Menampilkan 100 baris pertama dari total {result.totalRows} baris.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
