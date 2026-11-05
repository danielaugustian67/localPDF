import React, { useState } from 'react'
import { PDFMetadata } from '../../types'
import { DropZone } from '../common/DropZone'
import { getPDFMetadata, sanitizePDFMetadata } from '../../services/pdfService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  ShieldCheck,
  Trash2,
  Save,
  Check,
  AlertCircle,
  RotateCcw,
  FileText,
  User,
  Info,
  Laptop,
  Calendar,
  Lock,
  Tag
} from 'lucide-react'

export const MetadataView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
    path?: string
  } | null>(null)

  const [metadata, setMetadata] = useState<PDFMetadata | null>(null)
  const [editMetadata, setEditMetadata] = useState<PDFMetadata>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
    creationDate: '',
    modificationDate: ''
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileSelected = async (
    files: { name: string; data: Uint8Array; path?: string; size: number }[]
  ) => {
    if (files.length === 0) return
    const target = files[0]
    setFile(target)
    setStatusMessage(null)
    setIsProcessing(true)

    try {
      const meta = await getPDFMetadata(target.data)
      setMetadata(meta)
      setEditMetadata(meta)
    } catch (err: any) {
      console.error('Error reading metadata:', err)
      setStatusMessage({ type: 'error', text: 'Gagal membaca metadata dokumen.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveSanitized = async (custom?: boolean) => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const sanitizedBytes = await sanitizePDFMetadata(
        file.data,
        custom ? editMetadata : undefined
      )

      const defaultSaveName = `${file.name.replace(/\.pdf$/i, '')}_sanitized.pdf`

      if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
        const saveRes = await window.electronAPI.saveFileDialog(defaultSaveName)
        if (!saveRes.canceled && saveRes.filePath) {
          const writeRes = await window.electronAPI.writeFile(saveRes.filePath, sanitizedBytes)
          if (writeRes.success) {
            setStatusMessage({
              type: 'success',
              text: `Metadata berhasil dibersihkan dan disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
            })
          } else {
            throw new Error(writeRes.error || 'Gagal menyimpan berkas.')
          }
        }
      } else {
        const blob = new Blob([sanitizedBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultSaveName
        a.click()
        URL.revokeObjectURL(url)
        setStatusMessage({
          type: 'success',
          text: 'Metadata berhasil dibersihkan dan diunduh.'
        })
      }
    } catch (err: any) {
      console.error('Sanitize error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal membersihkan berkas.' })
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
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t.metaTitle}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.metaSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setMetadata(null)
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
            {/* File Info Card */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {file.name}
                  </h4>
                  <p className="text-[11px] font-mono text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Sanitize Action Button */}
              <button
                disabled={isProcessing}
                onClick={() => handleSaveSanitized(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>{t.metaSanitizeBtn}</span>
              </button>
            </div>

            {/* Metadata Fields Inspection & Custom Editing */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  {t.metadata}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    {t.metaTitleField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.title}
                    onChange={(e) => setEditMetadata({ ...editMetadata, title: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <User className="w-3 h-3 text-zinc-400" />
                    {t.metaAuthorField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.author}
                    onChange={(e) => setEditMetadata({ ...editMetadata, author: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Info className="w-3 h-3 text-zinc-400" />
                    {t.metaSubjectField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.subject}
                    onChange={(e) => setEditMetadata({ ...editMetadata, subject: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3 text-zinc-400" />
                    {t.metaKeywordsField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.keywords}
                    onChange={(e) => setEditMetadata({ ...editMetadata, keywords: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>

                {/* Creator Software */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <Laptop className="w-3 h-3 text-zinc-400" />
                    {t.metaCreatorField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.creator}
                    onChange={(e) => setEditMetadata({ ...editMetadata, creator: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>

                {/* PDF Producer */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3 h-3 text-zinc-400" />
                    {t.metaProducerField}
                  </label>
                  <input
                    type="text"
                    value={editMetadata.producer}
                    onChange={(e) => setEditMetadata({ ...editMetadata, producer: e.target.value })}
                    placeholder="Kosong"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                  />
                </div>
              </div>

              {/* Readonly Date Trails */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{t.created} {metadata?.creationDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{t.modified} {metadata?.modificationDate}</span>
                </div>
              </div>

              {/* Bottom Custom Save */}
              <div className="pt-3 flex justify-end">
                <button
                  disabled={isProcessing}
                  onClick={() => handleSaveSanitized(true)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{t.metaSaveCustom}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
