import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import { convertPDFToDocx, ExtractedParagraph } from '../../services/docxService'
import { runOcrPipeline, ocrPagesToParagraphs } from '../../services/ocrService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  FileText,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  ScanText,
  FileCheck2
} from 'lucide-react'

export const PdfToDocxView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [mode, setMode] = useState<'digital' | 'ocr'>('digital')

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    percent?: number
    status?: string
  } | null>(null)
  const [docxResult, setDocxResult] = useState<{
    bytes: Uint8Array
    paragraphsCount: number
    wordsCount: number
    isScanned: boolean
    previewParagraphs: ExtractedParagraph[]
  } | null>(null)

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
    setDocxResult(null)
    setStatusMessage(null)
    setProgress(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch (err) {
      console.error('Error loading PDF for DOCX conversion:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const handleConvert = async () => {
    if (!file) return

    setIsProcessing(true)
    setStatusMessage(null)
    setDocxResult(null)

    try {
      if (mode === 'ocr') {
        const ocr = await runOcrPipeline(
          file.data,
          { language: 'ind+eng', outputFormat: 'docx' },
          (p) =>
            setProgress({
              current: p.currentPage,
              total: p.totalPages,
              percent: p.percent,
              status: p.status
            })
        )
        const paragraphs = ocrPagesToParagraphs(ocr.pages)
        const body = paragraphs.filter((p) => !p.isHeading || !/^Halaman \d+$/.test(p.text))
        const wordsCount = ocr.fullText.split(/\s+/).filter(Boolean).length

        if (!ocr.docxBytes || wordsCount === 0) {
          throw new Error('OCR tidak menemukan teks pada dokumen ini.')
        }

        setDocxResult({
          bytes: ocr.docxBytes,
          paragraphsCount: body.length,
          wordsCount,
          isScanned: true,
          previewParagraphs: paragraphs
        })
        setStatusMessage({
          type: 'success',
          text: `${t.docxSuccess} (OCR)! (${wordsCount} ${t.wordsExtracted}, ${body.length} ${t.paragraphsExtracted}, akurasi ${ocr.averageConfidence}%)`
        })
        return
      }

      const result = await convertPDFToDocx(file.data, (cur, tot) => {
        setProgress({ current: cur, total: tot })
      })

      setDocxResult({
        bytes: result.docxBytes,
        paragraphsCount: result.paragraphsCount,
        wordsCount: result.wordsCount,
        isScanned: result.isScanned,
        previewParagraphs: result.paragraphs
      })

      if (result.isScanned) {
        setStatusMessage({
          type: 'warning',
          text: t.scannedNotice
        })
      } else {
        setStatusMessage({
          type: 'success',
          text: `${t.docxSuccess}! (${result.wordsCount} ${t.wordsExtracted}, ${result.paragraphsCount} ${t.paragraphsExtracted})`
        })
      }
    } catch (err: any) {
      console.error('DOCX conversion error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengonversi ke Word.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveDocx = async () => {
    if (!file || !docxResult) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}.docx`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(saveRes.filePath, docxResult.bytes)
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        } else {
          throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
        }
      }
    } else {
      const blob = new Blob([docxResult.bytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
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
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {t.pdfToDocxTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.pdfToDocxSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setDocxResult(null)
              setProgress(null)
              setStatusMessage(null)
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
          ) : statusMessage.type === 'warning' ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
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
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-4 h-4" />
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
            </div>

            {/* Mode Selector */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-2.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                Pilih Mode Ekstraksi:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('digital')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === 'digital'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-850 shadow-2xs ring-1 ring-zinc-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {t.modeDigital}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">100% Presisi</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {t.modeDigitalDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('ocr')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === 'ocr'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-850 shadow-2xs ring-1 ring-zinc-900/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <ScanText className="w-3.5 h-3.5 text-amber-500" />
                      {t.modeOcr}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Scan / Foto</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {t.modeOcrDesc}
                  </p>
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>{progress.status || 'Mengekstrak struktur & teks dokumen...'}</span>
                  <span>
                    {progress.percent !== undefined
                      ? `${progress.percent}%`
                      : `${progress.current} / ${progress.total} halaman`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-200"
                    style={{
                      width: `${progress.percent ?? (progress.current / progress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Conversion Success Card */}
            {docxResult && (
              <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xs font-mono">
                      DOCX
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Dokumen Microsoft Word Siap
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {docxResult.wordsCount} {t.wordsExtracted} • {docxResult.paragraphsCount} {t.paragraphsExtracted} • {(docxResult.bytes.byteLength / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveDocx}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.saveDocxBtn}</span>
                  </button>
                </div>

                {/* Content Preview Box */}
                {docxResult.previewParagraphs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono">
                        {t.previewText}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {docxResult.previewParagraphs.length} paragraf
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-left font-sans select-text">
                      {docxResult.previewParagraphs.map((para, idx) => (
                        <div key={idx}>
                          {para.isHeading ? (
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-2 mb-1">
                              {para.text}
                            </h4>
                          ) : (
                            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              {para.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      {file && !docxResult && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t.convertDocxBtn}...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>{t.convertDocxBtn}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
