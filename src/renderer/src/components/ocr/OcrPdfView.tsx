import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { getPageCount } from '../../services/pdfService'
import {
  runOcrPipeline,
  OcrLanguage,
  OcrOutputFormat,
  OcrCompleteResult,
  OcrProgress
} from '../../services/ocrService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  ScanText,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  FileCode2,
  Sparkles,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Languages
} from 'lucide-react'

export const OcrPdfView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [pageCount, setPageCount] = useState<number>(1)
  const [language, setLanguage] = useState<OcrLanguage>('ind+eng')
  const [outputFormat, setOutputFormat] = useState<OcrOutputFormat>('searchable-pdf')
  const [binarize, setBinarize] = useState<boolean>(true)
  const [contrast, setContrast] = useState<boolean>(true)
  const [sharpen, setSharpen] = useState<boolean>(true)

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrCompleteResult | null>(null)
  const [copied, setCopied] = useState(false)

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
    setOcrResult(null)
    setStatusMessage(null)

    try {
      const count = await getPageCount(target.data)
      setPageCount(count)
    } catch {
      setPageCount(1)
    }
  }

  const handleRunOcr = async () => {
    if (!file) return

    setIsProcessing(true)
    setStatusMessage(null)
    setOcrResult(null)

    try {
      const res = await runOcrPipeline(
        file.data,
        {
          language,
          outputFormat,
          preprocess: { binarize, contrast, sharpen }
        },
        (prog) => setProgress(prog)
      )

      setOcrResult(res)
      setStatusMessage({
        type: 'success',
        text: `OCR Berhasil! ${res.totalPages} halaman diproses dengan rata-rata akurasi ${res.averageConfidence}%.`
      })
    } catch (err: any) {
      console.error('OCR pipeline error:', err)
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal memproses OCR dokumen.' })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const handleSaveSearchablePdf = async () => {
    if (!file || !ocrResult?.searchablePdfBytes) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_searchable.pdf`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(
          saveRes.filePath,
          ocrResult.searchablePdfBytes
        )
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([ocrResult.searchablePdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSaveDocx = async () => {
    if (!file || !ocrResult?.docxBytes) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_ocr.docx`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(saveRes.filePath, ocrResult.docxBytes)
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([ocrResult.docxBytes as BlobPart], {
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

  const handleCopyText = () => {
    if (!ocrResult?.fullText) return
    navigator.clipboard.writeText(ocrResult.fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveTextFile = () => {
    if (!file || !ocrResult?.fullText) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_ocr.txt`
    const blob = new Blob([ocrResult.fullText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ScanText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t.ocrPdfTitle || 'OCR PDF (Optical Character Recognition)'}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.ocrPdfSubtitle ||
              'Ekstrak dan kenali teks dari lembar scan fisik atau gambar menjadi dokumen yang dapat diedit dan dicari.'}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setOcrResult(null)
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

      {/* Workspace Content */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
        {!file ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-md">
              <DropZone
                onFilesSelected={handleFileSelected}
                multiple={false}
                title={t.dropOcrTitle || 'Pilih Dokumen Scan untuk OCR'}
                subtitle={t.dropOcrSubtitle || 'Dukungan scan dokumen PDF, nota, surat, atau foto halaman'}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info Bar & Execute Button */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ScanText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {pageCount} Halaman
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunOcr}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mulai Proses OCR</span>
                  </>
                )}
              </button>
            </div>

            {/* OCR Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Language Selection */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 shadow-2xs">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-zinc-500" />
                  Bahasa Dokumen
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrLang"
                      checked={language === 'ind+eng'}
                      onChange={() => setLanguage('ind+eng')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Indonesia & English (Direkomendasikan)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrLang"
                      checked={language === 'ind'}
                      onChange={() => setLanguage('ind')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Bahasa Indonesia
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrLang"
                      checked={language === 'eng'}
                      onChange={() => setLanguage('eng')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      English Only
                    </span>
                  </label>
                </div>
              </div>

              {/* Output Format Selection */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 shadow-2xs">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  Format Keluaran
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrFormat"
                      checked={outputFormat === 'searchable-pdf'}
                      onChange={() => setOutputFormat('searchable-pdf')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Searchable PDF (Teks Dapat Diseleksi)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrFormat"
                      checked={outputFormat === 'docx'}
                      onChange={() => setOutputFormat('docx')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Dokumen Microsoft Word (.docx)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="radio"
                      name="ocrFormat"
                      checked={outputFormat === 'text'}
                      onChange={() => setOutputFormat('text')}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Teks Murni (.txt / .md)
                    </span>
                  </label>
                </div>
              </div>

              {/* Accuracy Preprocessing Options */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 shadow-2xs">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  Optimasi Akurasi
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="checkbox"
                      checked={binarize}
                      onChange={(e) => setBinarize(e.target.checked)}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Binarisasi Adaptif Otsu (Bersihkan Kertas)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="checkbox"
                      checked={contrast}
                      onChange={(e) => setContrast(e.target.checked)}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Peregangan Kontras Tinta
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850">
                    <input
                      type="checkbox"
                      checked={sharpen}
                      onChange={(e) => setSharpen(e.target.checked)}
                    />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Penajaman Glif Huruf (Sharpening)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Progress Bar when running */}
            {isProcessing && progress && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {progress.status}
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {progress.percent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* OCR Result Card */}
            {ocrResult && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Hasil Ekstraksi OCR ({ocrResult.totalPages} Halaman)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {ocrResult.averageConfidence}% Akurasi
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {outputFormat === 'searchable-pdf' && (
                      <button
                        onClick={handleSaveSearchablePdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Simpan Searchable PDF</span>
                      </button>
                    )}

                    {outputFormat === 'docx' && (
                      <button
                        onClick={handleSaveDocx}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Simpan Dokumen Word</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopyText}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSaveTextFile}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh .TXT</span>
                    </button>
                  </div>
                </div>

                {/* Textarea preview */}
                <textarea
                  readOnly
                  rows={8}
                  value={ocrResult.fullText}
                  className="w-full p-3 rounded-lg font-mono text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
