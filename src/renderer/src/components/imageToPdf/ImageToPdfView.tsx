import React, { useState } from 'react'
import { ImageFileItem, ImageToPdfOptions } from '../../types'
import { convertImagesToPDF } from '../../services/pdfService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Image as ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Check,
  AlertCircle,
  Plus,
  Loader2,
  FileCheck
} from 'lucide-react'

export const ImageToPdfView: React.FC = () => {
  const { t } = useTranslation()
  const [images, setImages] = useState<ImageFileItem[]>([])
  const [options, setOptions] = useState<ImageToPdfOptions>({
    pageSize: 'A4',
    orientation: 'auto',
    margin: 'small'
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle files input
  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setStatusMessage(null)

    const items: ImageFileItem[] = []
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith('image/')) continue

      const buffer = await f.arrayBuffer()
      const dataUrl = URL.createObjectURL(f)

      items.push({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        size: f.size,
        data: new Uint8Array(buffer),
        dataUrl
      })
    }

    setImages((prev) => [...prev, ...items])
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...images]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setImages(updated)
  }

  const moveDown = (index: number) => {
    if (index === images.length - 1) return
    const updated = [...images]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setImages(updated)
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleConvert = async () => {
    if (images.length === 0) return
    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const pdfBytes = await convertImagesToPDF(images, options)

      if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
        const saveRes = await window.electronAPI.saveFileDialog('foto-dokumen.pdf')
        if (!saveRes.canceled && saveRes.filePath) {
          const writeRes = await window.electronAPI.writeFile(saveRes.filePath, pdfBytes)
          if (writeRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Berhasil mengonversi ${images.length} gambar ke: ${saveRes.filePath.split(/[/\\]/).pop()}`
            })
          } else {
            throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
          }
        }
      } else {
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'foto-dokumen.pdf'
        a.click()
        URL.revokeObjectURL(url)
        setStatusMessage({
          type: 'success',
          text: `Berhasil mengonversi ${images.length} gambar ke PDF.`
        })
      }
    } catch (err: any) {
      console.error('Convert image to pdf error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengonversi gambar ke PDF.' })
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
            <ImageIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.imgToPdfTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.imgToPdfSubtitle}
          </p>
        </div>

        {images.length > 0 && (
          <button
            onClick={() => setImages([])}
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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
        {images.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <label className="w-full max-w-md border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-3 shadow-2xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {t.dropImageTitle}
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {t.dropImageSubtitle}
              </p>
              <div className="mt-4 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs flex items-center gap-1.5">
                <Plus className="w-3 h-3 text-zinc-500" />
                {t.dropImageBtn}
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Page Setup Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 text-xs shadow-2xs">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  {t.pageSize}:
                </label>
                <select
                  value={options.pageSize}
                  onChange={(e) => setOptions({ ...options, pageSize: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                >
                  <option value="A4">{t.pageSizeA4}</option>
                  <option value="Letter">{t.pageSizeLetter}</option>
                  <option value="fit">{t.pageSizeFit}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  {t.orientation}:
                </label>
                <select
                  value={options.orientation}
                  onChange={(e) => setOptions({ ...options, orientation: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                >
                  <option value="auto">{t.orientationAuto}</option>
                  <option value="portrait">{t.orientationPortrait}</option>
                  <option value="landscape">{t.orientationLandscape}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  {t.margin}:
                </label>
                <select
                  value={options.margin}
                  onChange={(e) => setOptions({ ...options, margin: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                >
                  <option value="none">{t.marginNone}</option>
                  <option value="small">{t.marginSmall}</option>
                  <option value="normal">{t.marginNormal}</option>
                </select>
              </div>
            </div>

            {/* List of images */}
            <div className="space-y-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs"
                >
                  <span className="w-5 text-center font-mono text-[11px] text-zinc-400 font-semibold shrink-0">
                    {idx + 1}
                  </span>

                  <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {img.name}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {formatSize(img.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === images.length - 1}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1 rounded-md text-zinc-400 hover:text-rose-600 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add more button */}
              <label className="w-full py-3 px-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleFilesAdded(e.target.files)}
                  className="hidden"
                />
                <Plus className="w-3.5 h-3.5" />
                <span>Tambahkan gambar lainnya</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {images.length > 0 && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {images.length} gambar dipilih
          </div>

          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.convertBtn}...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3.5 h-3.5" />
                <span>{t.convertBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
