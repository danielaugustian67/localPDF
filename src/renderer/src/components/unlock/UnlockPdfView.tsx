import React, { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { checkPdfEncryption, unlockPdfDocument } from '../../services/unlockService'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  LockKeyholeOpen,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react'

export const UnlockPdfView: React.FC = () => {
  const { t } = useTranslation()
  const [file, setFile] = useState<{
    name: string
    data: Uint8Array
    size: number
  } | null>(null)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [unlockedBytes, setUnlockedBytes] = useState<Uint8Array | null>(null)
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
    setUnlockedBytes(null)
    setStatusMessage(null)
    setPassword('')

    try {
      const status = await checkPdfEncryption(target.data)
      setIsEncrypted(status.isEncrypted)
      if (!status.isEncrypted) {
        setStatusMessage({
          type: 'warning',
          text: t.notEncryptedNotice
        })
      }
    } catch (err) {
      console.error('Error checking PDF encryption:', err)
      setStatusMessage({ type: 'error', text: 'Gagal menganalisis proteksi PDF.' })
    }
  }

  const handleUnlock = async () => {
    if (!file) return
    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const unlocked = await unlockPdfDocument(file.data, password)
      setUnlockedBytes(unlocked)
      setStatusMessage({
        type: 'success',
        text: t.unlockSuccess
      })
    } catch (err: any) {
      console.error('Unlock error:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Password salah atau gagal mendekripsi dokumen.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveUnlocked = async () => {
    if (!file || !unlockedBytes) return
    const defaultName = `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`

    if (window.electronAPI && typeof window.electronAPI.saveFileDialog === 'function') {
      const saveRes = await window.electronAPI.saveFileDialog(defaultName)
      if (!saveRes.canceled && saveRes.filePath) {
        const writeRes = await window.electronAPI.writeFile(saveRes.filePath, unlockedBytes)
        if (writeRes.success) {
          setStatusMessage({
            type: 'success',
            text: `Berhasil disimpan: ${saveRes.filePath.split(/[/\\]/).pop()}`
          })
        }
      }
    } else {
      const blob = new Blob([unlockedBytes as BlobPart], { type: 'application/pdf' })
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
            <LockKeyholeOpen className="w-4 h-4 text-amber-500" />
            {t.unlockPdfTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.unlockPdfSubtitle}
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null)
              setUnlockedBytes(null)
              setStatusMessage(null)
              setPassword('')
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
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                    {isEncrypted ? 'Terkunci Password' : 'Tidak Terkunci'}
                  </p>
                </div>
              </div>
            </div>

            {/* Password Input Area */}
            {!unlockedBytes && (
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-3 shadow-2xs">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {t.enterPasswordPlaceholder}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password pembuka dokumen..."
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUnlock()
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleUnlock}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs disabled:opacity-40 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mendekripsi Dokumen...</span>
                      </>
                    ) : (
                      <>
                        <LockKeyholeOpen className="w-3.5 h-3.5" />
                        <span>{t.unlockBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Unlocked Success Card */}
            {unlockedBytes && (
              <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        PDF Bebas Enkripsi Siap
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        Ukuran: {(unlockedBytes.byteLength / 1024).toFixed(1)} KB • Akses baca &
                        cetak 100% terbuka
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveUnlocked}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.saveUnlockedBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
