import React, { useState } from 'react'
import { PDFPageItem, WatermarkOptions, PageNumberOptions } from '../../types'
import { DropZone } from '../common/DropZone'
import { renderAllThumbnails } from '../../services/pdfThumbnail'
import { getPageCount, modifyPDF } from '../../services/pdfService'
import { WatermarkModal } from './WatermarkModal'
import { PageNumberModal } from './PageNumberModal'
import { AnnotationEditorModal } from './AnnotationEditorModal'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  LayoutTemplate,
  RotateCw,
  RotateCcw,
  Trash2,
  Stamp,
  Hash,
  Download,
  Check,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  RotateCcw as ResetIcon,
  Loader2,
  FileSignature
} from 'lucide-react'

export const EditView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
    path?: string
  } | null>(null)

  const [pages, setPages] = useState<PDFPageItem[]>([])
  const [loadingPages, setLoadingPages] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Annotation Editor Modal
  const [activeAnnotationPage, setActiveAnnotationPage] = useState<PDFPageItem | null>(null)

  // Watermark Modal
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    enabled: false,
    text: 'RAHASIA',
    opacity: 0.25,
    fontSize: 42,
    color: '#71717a',
    rotation: 45
  })

  // Page Numbers Modal
  const [pageNumberOpen, setPageNumberOpen] = useState(false)
  const [pageNumberOptions, setPageNumberOptions] = useState<PageNumberOptions>({
    enabled: false,
    position: 'bottom-center',
    format: 'page-of-total',
    startFrom: 1,
    fontSize: 10
  })

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setStatusMessage(null)
    setLoadingPages(true)

    try {
      const count = await getPageCount(target.data)
      const thumbs = await renderAllThumbnails(target.data, 0.3)

      const pageItems: PDFPageItem[] = []
      for (let i = 0; i < count; i++) {
        pageItems.push({
          id: `page-${i}-${Date.now()}`,
          pageIndex: i + 1,
          originalIndex: i,
          rotation: 0,
          thumbnail: thumbs[i] || '',
          isDeleted: false
        })
      }

      setPages(pageItems)
    } catch (err) {
      console.error('Error loading PDF for edit:', err)
      setStatusMessage({ type: 'error', text: 'Gagal memuat halaman PDF.' })
    } finally {
      setLoadingPages(false)
    }
  }

  const rotatePage = (id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newRot = (p.rotation + delta + 360) % 360
          return { ...p, rotation: newRot }
        }
        return p
      })
    )
  }

  const rotateAllPages = (delta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (!p.isDeleted) {
          return { ...p, rotation: (p.rotation + delta + 360) % 360 }
        }
        return p
      })
    )
  }

  const toggleDeletePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, isDeleted: !p.isDeleted }
        }
        return p
      })
    )
  }

  const movePageLeft = (index: number) => {
    if (index === 0) return
    const updated = [...pages]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setPages(updated)
  }

  const movePageRight = (index: number) => {
    if (index === pages.length - 1) return
    const updated = [...pages]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setPages(updated)
  }

  const resetChanges = () => {
    setPages((prev) =>
      [...prev]
        .sort((a, b) => a.originalIndex - b.originalIndex)
        .map((p) => ({ ...p, rotation: 0, isDeleted: false, annotationOverlay: undefined }))
    )
    setWatermarkOptions((prev) => ({ ...prev, enabled: false }))
    setPageNumberOptions((prev) => ({ ...prev, enabled: false }))
  }

  // Handle saved annotation from canvas modal
  const handleSaveAnnotation = (pageId: string, overlayDataUrl: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          return { ...p, annotationOverlay: overlayDataUrl }
        }
        return p
      })
    )
  }

  const remainingCount = pages.filter((p) => !p.isDeleted).length

  const handleSaveModified = async () => {
    if (!file || remainingCount === 0) return

    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const outputBytes = await modifyPDF(
        file.data,
        pages,
        watermarkOptions.enabled ? watermarkOptions : undefined,
        pageNumberOptions.enabled ? pageNumberOptions : undefined
      )

      const defaultSaveName = `${file.name.replace(/\.pdf$/i, '')}_edited.pdf`

      if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
        const saveRes = await window.electronAPI.saveFileDialog(defaultSaveName)
        if (!saveRes.canceled && saveRes.filePath) {
          const writeRes = await window.electronAPI.writeFile(saveRes.filePath, outputBytes)
          if (writeRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
            })
          } else {
            throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
          }
        }
      } else {
        const blob = new Blob([outputBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultSaveName
        a.click()
        URL.revokeObjectURL(url)
        setStatusMessage({
          type: 'success',
          text: `Dokumen berhasil diekspor (${remainingCount} halaman).`
        })
      }
    } catch (err: any) {
      console.error('Save error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan PDF.' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-6xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            {t.editTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.editSubtitle}
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={resetChanges}
              title={t.reset}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <ResetIcon className="w-3 h-3" />
              {t.reset}
            </button>
            <button
              onClick={() => {
                setFile(null)
                setPages([])
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {t.changeFile}
            </button>
          </div>
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

      {/* Main Grid Content */}
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
          <div className="space-y-3">
            {/* Action Strip Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
              {/* Batch rotation controls */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mr-1 pl-1">
                  {t.rotateAllPages}
                </span>
                <button
                  onClick={() => rotateAllPages(90)}
                  className="px-2 py-1 rounded-md text-[11px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors border border-zinc-200/60 dark:border-zinc-700/60"
                >
                  <RotateCw className="w-3 h-3 text-zinc-500" />
                  +90°
                </button>
                <button
                  onClick={() => rotateAllPages(-90)}
                  className="px-2 py-1 rounded-md text-[11px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors border border-zinc-200/60 dark:border-zinc-700/60"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-500" />
                  -90°
                </button>
              </div>

              {/* Annotation triggers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWatermarkOpen(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
                    watermarkOptions.enabled
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Stamp className="w-3 h-3" />
                  <span>{t.watermark}</span>
                  {watermarkOptions.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>

                <button
                  onClick={() => setPageNumberOpen(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
                    pageNumberOptions.enabled
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Hash className="w-3 h-3" />
                  <span>{t.pageNumbersShort}</span>
                  {pageNumberOptions.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Pages Grid with Real Paper Proportions */}
            {loadingPages ? (
              <div className="p-16 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono">Menyiapkan pratinjau lembar dokumen...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-1">
                {pages.map((p, idx) => {
                  return (
                    <div
                      key={p.id}
                      className={`relative group rounded-xl p-2 border transition-all duration-150 flex flex-col justify-between ${
                        p.isDeleted
                          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 opacity-40'
                          : 'border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs'
                      }`}
                    >
                      {/* Top Bar Card */}
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] font-semibold text-zinc-500">
                            #{idx + 1}
                          </span>
                          {p.annotationOverlay && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Ada tanda tangan / coretan" />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {p.rotation !== 0 && (
                            <span className="font-mono text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                              {p.rotation}°
                            </span>
                          )}

                          <button
                            onClick={() => toggleDeletePage(p.id)}
                            title={p.isDeleted ? 'Pulihkan Halaman' : 'Hapus Halaman'}
                            className={`p-0.5 rounded transition-colors ${
                              p.isDeleted
                                ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            {p.isDeleted ? <Undo2 className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Paper Thumbnail Frame with Click-to-Annotate */}
                      <div
                        onClick={() => !p.isDeleted && setActiveAnnotationPage(p)}
                        className={`relative w-full aspect-[1/1.414] bg-zinc-100 dark:bg-zinc-800/80 rounded border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden flex items-center justify-center shadow-2xs ${
                          !p.isDeleted ? 'cursor-pointer hover:ring-2 hover:ring-zinc-400/50' : ''
                        }`}
                        title={t.clickToAnnotate}
                      >
                        {p.thumbnail ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img
                              src={p.thumbnail}
                              alt={`Halaman ${idx + 1}`}
                              style={{
                                transform: `rotate(${p.rotation}deg)`,
                                transition: 'transform 0.15s ease'
                              }}
                              className="w-full h-full object-contain"
                            />
                            {/* Overlay preview if annotated */}
                            {p.annotationOverlay && (
                              <img
                                src={p.annotationOverlay}
                                alt="Overlay"
                                style={{
                                  transform: `rotate(${p.rotation}deg)`
                                }}
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                              />
                            )}
                          </div>
                        ) : (
                          <FileText className="w-6 h-6 text-zinc-300" />
                        )}

                        {/* Hover Quick Action Badge */}
                        {!p.isDeleted && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="px-2 py-1 rounded bg-zinc-900/90 text-white text-[10px] font-medium flex items-center gap-1 shadow-lg">
                              <FileSignature className="w-3 h-3" />
                              {t.annotatePage}
                            </span>
                          </div>
                        )}

                        {/* Deleted overlay badge */}
                        {p.isDeleted && (
                          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white text-[10px] font-mono font-semibold gap-1">
                            <EyeOff className="w-4 h-4 text-zinc-300" />
                            <span>{t.delete}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls (Reorder & Rotate & Annotate) */}
                      {!p.isDeleted && (
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => movePageLeft(idx)}
                              disabled={idx === 0}
                              title="Geser ke kiri"
                              className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => movePageRight(idx)}
                              disabled={idx === pages.length - 1}
                              title="Geser ke kanan"
                              className="p-0.5 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setActiveAnnotationPage(p)}
                              title="Buka Editor Anotasi & Tanda Tangan"
                              className="p-0.5 rounded text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              <FileSignature className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => rotatePage(p.id, 90)}
                              title="Putar 90°"
                              className="p-0.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {file && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {remainingCount} dari {pages.length} halaman aktif
          </div>

          <button
            onClick={handleSaveModified}
            disabled={isProcessing || remainingCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.saveModified}...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t.saveModified}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      <AnnotationEditorModal
        isOpen={Boolean(activeAnnotationPage)}
        onClose={() => setActiveAnnotationPage(null)}
        pageItem={activeAnnotationPage}
        pdfBytes={file?.data || null}
        onSaveAnnotation={handleSaveAnnotation}
      />

      <WatermarkModal
        isOpen={watermarkOpen}
        onClose={() => setWatermarkOpen(false)}
        options={watermarkOptions}
        onChange={setWatermarkOptions}
      />

      <PageNumberModal
        isOpen={pageNumberOpen}
        onClose={() => setPageNumberOpen(false)}
        options={pageNumberOptions}
        onChange={setPageNumberOptions}
      />
    </div>
  )
}
