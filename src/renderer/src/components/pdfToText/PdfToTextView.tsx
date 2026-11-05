import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import {
  extractPDFTextAndMarkdown,
  PDFTextResult
} from '../../services/textExportService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  FileCode2,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  FileText
} from 'lucide-react'

export const PdfToTextView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<PDFTextResult | null>(null)
  const [format, setFormat] = useState<'plain' | 'markdown'>('markdown')
  const [copied, setCopied] = useState(false)
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
      console.error('Error loading PDF for Text Export:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca berkas PDF.' })
    }
  }

  const handleExtract = async () => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)
    setResult(null)

    try {
      const res = await extractPDFTextAndMarkdown(file.data, (cur, tot) => {
        setProgress({ current: cur, total: tot })
      })

      setResult(res)
      setStatusMessage({
        type: 'success',
        text: `Berhasil mengekstrak ${res.wordCount} ${t.wordsLabel} (${res.characterCount} ${t.charsLabel})`
      })
    } catch (err: any) {
      console.error('Text extraction error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengekstrak teks.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    const textToCopy = format === 'markdown' ? result.markdownText : result.plainText
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveFile = async () => {
    if (!file || !result) return
    const ext = format === 'markdown' ? 'md' : 'txt'
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}.${ext}`
    const content = format === 'markdown' ? result.markdownText : result.plainText

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const encoder = new TextEncoder()
        const writeRes = await window.electronAPI.writeFile(
          saveRes.filePath,
          encoder.encode(content)
        )
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([content], {
        type: format === 'markdown' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;'
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
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            {t.pdfToTextTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.pdfToTextSubtitle}
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
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
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

              {!result && (
                <button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengekstrak Teks...</span>
                    </>
                  ) : (
                    <>
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>Ekstrak Teks & Markdown</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress indicator */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  <span>Membaca kata dan struktur heading...</span>
                  <span>
                    {progress.current} / {progress.total} halaman
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 dark:bg-sky-400 transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Text Editor / Result Card */}
            {result && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
                {/* Bar Toolbar */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFormat('markdown')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        format === 'markdown'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {t.formatMarkdown}
                    </button>
                    <button
                      onClick={() => setFormat('plain')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        format === 'plain'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {t.formatPlainText}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-400 mr-2">
                      {result.wordCount} {t.wordsLabel} • {result.characterCount} {t.charsLabel} •{' '}
                      {result.lineCount} {t.linesLabel}
                    </span>

                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">{t.copiedSuccess}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t.copyTextBtn}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSaveFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{format === 'markdown' ? t.saveMdBtn : t.saveTxtBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Text View Area */}
                <textarea
                  readOnly
                  value={format === 'markdown' ? result.markdownText : result.plainText}
                  className="w-full h-80 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
