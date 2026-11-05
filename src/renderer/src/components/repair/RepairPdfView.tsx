import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import {
  diagnosePdf,
  repairPdfDocument,
  RepairDiagnostics,
  RepairResult
} from '../../services/repairService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Wrench,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileCheck2
} from 'lucide-react'

export const RepairPdfView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [diagnostics, setDiagnostics] = useState<RepairDiagnostics | null>(null)
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null)
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
    setDiagnostics(null)
    setRepairResult(null)
    setStatusMessage(null)
    setIsDiagnosing(true)

    try {
      const diag = await diagnosePdf(target.data)
      setDiagnostics(diag)
      if (diag.issuesDetected.length > 0) {
        setStatusMessage({
          type: 'warning',
          text: `Terdeteksi ${diag.issuesDetected.length} anomali pada berkas PDF.`
        })
      } else {
        setStatusMessage({
          type: 'success',
          text: t.healthHealthy
        })
      }
    } catch (err: any) {
      console.error('Diagnostic error:', err)
      setStatusMessage({ type: 'error', text: 'Gagal mendiagnosis berkas.' })
    } finally {
      setIsDiagnosing(false)
    }
  }

  const handleRepair = async () => {
    if (!file) return
    setIsRepairing(true)
    setStatusMessage(null)

    try {
      const res = await repairPdfDocument(file.data)
      setRepairResult(res)
      setStatusMessage({
        type: 'success',
        text: `${t.repairSuccess}! (${res.recoveredPages} halaman dipulihkan)`
      })
    } catch (err: any) {
      console.error('Repair error:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memperbaiki dokumen.' })
    } finally {
      setIsRepairing(false)
    }
  }

  const handleSaveRepaired = async () => {
    if (!file || !repairResult) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_repaired.pdf`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(
          saveRes.filePath,
          repairResult.repairedBytes
        )
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([repairResult.repairedBytes as BlobPart], { type: 'application/pdf' })
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
            <Wrench className="w-4 h-4 text-orange-500" />
            {t.repairPdfTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.repairPdfSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setDiagnostics(null)
              setRepairResult(null)
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
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {!repairResult && (
                <button
                  onClick={handleRepair}
                  disabled={isRepairing || isDiagnosing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
                >
                  {isRepairing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memperbaiki Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{t.repairBtn}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Health Diagnostics Card */}
            {diagnostics && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {t.healthStatus}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {diagnostics.pageCount} halaman terdeteksi
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Header Standar</span>
                    {diagnostics.hasValidHeader ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> Rusak
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Penanda EOF</span>
                    {diagnostics.hasValidEof ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> Hilang
                      </span>
                    )}
                  </div>
                </div>

                {diagnostics.issuesDetected.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Rincian Masalah Terdeteksi:
                    </p>
                    <ul className="text-xs font-mono space-y-1 text-zinc-600 dark:text-zinc-400 pl-4 list-disc">
                      {diagnostics.issuesDetected.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Repair Success Result Card */}
            {repairResult && (
              <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Dokumen Berhasil Dipulihkan
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {repairResult.recoveredPages} halaman dipulihkan • Ukuran:{' '}
                        {(repairResult.repairedBytes.byteLength / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveRepaired}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.saveRepairedBtn}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tindakan Perbaikan yang Dilakukan:
                  </p>
                  <ul className="text-xs font-mono space-y-1 text-emerald-700 dark:text-emerald-400 pl-4 list-disc">
                    {repairResult.fixesApplied.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
