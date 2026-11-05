import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import {
  extractEmbeddedImages,
  buildImagesZip,
  ExtractedImageItem
} from '../../services/imageExtractService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Image as ImageIcon,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  FolderArchive,
  Eye
} from 'lucide-react'

export const ExtractImagesView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [images, setImages] = useState<ExtractedImageItem[]>([])
  const [selectedPreview, setSelectedPreview] = useState<ExtractedImageItem | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setImages([])
    setStatusMessage(null)
    setProgress(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err) {
      console.error('Error loading PDF for Image Extraction:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const handleExtract = async () => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)
    setImages([])

    try {
      const extracted = await extractEmbeddedImages(file.data, (cur, tot) => {
        setProgress({ current: cur, total: tot })
      })

      setImages(extracted)
      if (extracted.length > 0) {
        setStatusMessage({
          type: 'success',
          text: `Berhasil mengekstrak ${extracted.length} ${t.imagesFound}!`
        })
      } else {
        setStatusMessage({
          type: 'warning',
          text: t.noImagesFound
        })
      }
    } catch (err: any) {
      console.error('Image extraction error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengekstrak gambar.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadSingle = async (img: ExtractedImageItem) => {
    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(img.name)
      if (!saveRes.canceled && saveRes.filePath) {
        await window.electronAPI.writeFile(saveRes.filePath, img.bytes)
      }
    } else {
      const a = document.createElement('a')
      a.href = img.dataUrl
      a.download = img.name
      a.click()
    }
  }

  const handleDownloadAllZip = async () => {
    if (images.length === 0 || !file) return
    const zipBytes = buildImagesZip(images)
    const defaultZipName = `${file.name.replace(/\.pdf$/i, '')}_images.zip`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultZipName)
      if (!saveRes.canceled && saveRes.filePath) {
        await window.electronAPI.writeFile(saveRes.filePath, zipBytes)
      }
    } else {
      const blob = new Blob([zipBytes as BlobPart], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultZipName
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
            <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            {t.extractImgTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.extractImgSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setImages([])
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
              : statusMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
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
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/60 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <ImageIcon className="w-4 h-4" />
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

              {images.length === 0 ? (
                <button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengekstrak Foto...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{t.extractImgBtn}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-xs transition-all"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>{t.downloadZipBtn}</span>
                </button>
              )}
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>Mencari foto & objek grafis di tiap lembar...</span>
                  <span>
                    {progress.current} / {progress.total} halaman
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 dark:bg-violet-400 transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
                  >
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-2 overflow-hidden relative">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      />
                      <button
                        onClick={() => setSelectedPreview(img)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-2.5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          Hal {img.pageNumber}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {img.width}x{img.height} • {img.sizeKb} KB
                        </p>
                      </div>

                      <button
                        onClick={() => handleDownloadSingle(img)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                        title="Unduh gambar ini"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPreview && (
        <div
          onClick={() => setSelectedPreview(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-3"
          >
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-mono pb-2 border-b border-zinc-800">
              <span>{selectedPreview.name}</span>
              <span>
                {selectedPreview.width} x {selectedPreview.height} px ({selectedPreview.sizeKb} KB)
              </span>
            </div>

            <img
              src={selectedPreview.dataUrl}
              alt={selectedPreview.name}
              className="max-h-[70vh] object-contain rounded-lg"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleDownloadSingle(selectedPreview)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar</span>
              </button>
              <button
                onClick={() => setSelectedPreview(null)}
                className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
