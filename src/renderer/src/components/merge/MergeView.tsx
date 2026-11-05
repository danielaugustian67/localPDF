import React, { useState } from 'react'
import { PDFFileItem } from '../../types'
import { DropZone } from '../common/DropZone'
import { renderPageThumbnail } from '../../services/pdfThumbnail'
import { getPageCount, mergePDFs } from '../../services/pdfService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
  Files,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react'

export const MergeView: React.FC = () => {
  const { t } = useTranslation()
  const [files, setFiles] = useState<PDFFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFilesAdded = async (
    newFiles: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    setStatusMessage(null)
    const items: PDFFileItem[] = []

    for (const f of newFiles) {
      try {
        const count = await getPageCount(f.data)
        const thumb = await renderPageThumbnail(f.data, 1, 0.25)

        items.push({
          id: Math.random().toString(36).substring(2, 9),
          name: f.name,
          path: f.path,
          size: f.size,
          pageCount: count,
          data: f.data,
          thumbnail: thumb
        })
      } catch (err) {
        console.error('Error loading PDF file:', err)
      }
    }

    setFiles((prev) => [...prev, ...items])
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...files]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setFiles(updated)
  }

  const moveDown = (index: number) => {
    if (index === files.length - 1) return
    const updated = [...files]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setFiles(updated)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalPages = files.reduce((acc, curr) => acc + curr.pageCount, 0)

  const handleMerge = async () => {
    if (files.length < 2) {
      setStatusMessage({ type: 'error', text: 'Pilih minimal 2 berkas PDF untuk digabungkan.' })
      return
    }

    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const mergedBytes = await mergePDFs(files.map((f) => ({ data: f.data, name: f.name })))

      if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
        const saveRes = await window.electronAPI.saveFileDialog('dokumen-tergabung.pdf')
        if (!saveRes.canceled && saveRes.filePath) {
          const writeRes = await window.electronAPI.writeFile(saveRes.filePath, mergedBytes)
          if (writeRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Berhasil menggabungkan ${files.length} berkas (${totalPages} halaman) ke: ${saveRes.filePath.split(/[/\\]/).pop()}`
            })
          } else {
            throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
          }
        }
      } else {
        const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dokumen-tergabung.pdf'
        a.click()
        URL.revokeObjectURL(url)
        setStatusMessage({
          type: 'success',
          text: `Berhasil menggabungkan ${files.length} berkas (${totalPages} halaman).`
        })
      }
    } catch (err: any) {
      console.error('Merge error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menggabungkan PDF.' })
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
            <Files className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.mergeTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.mergeSubtitle}
          </p>
        </div>

        {files.length > 0 && (
          <button
            onClick={() => setFiles([])}
            className="text-[11px] font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
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
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-md">
              <DropZone
                onFilesSelected={handleFilesAdded}
                multiple={true}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-2xs"
              >
                {/* Index badge */}
                <div className="w-5 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold shrink-0">
                  {idx + 1}
                </div>

                {/* Thumbnail Sheet */}
                <div className="w-9 h-12 rounded-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-zinc-400" />
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {file.pageCount} halaman • {formatSize(file.size)}
                  </p>
                </div>

                {/* Move & Remove Controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Pindahkan ke atas"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === files.length - 1}
                    title="Pindahkan ke bawah"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFile(file.id)}
                    title="Hapus dari daftar"
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Compact append dropzone */}
            <div className="pt-2">
              <DropZone
                onFilesSelected={handleFilesAdded}
                multiple={true}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      {files.length > 0 && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {files.length} {t.filesLabel} • {totalPages} {t.totalPagesLabel}
          </div>

          <button
            onClick={handleMerge}
            disabled={isProcessing || files.length < 2}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.mergeBtn}...</span>
              </>
            ) : (
              <>
                <Files className="w-3.5 h-3.5" />
                <span>{t.mergeBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
