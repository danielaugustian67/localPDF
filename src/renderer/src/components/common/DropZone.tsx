import React, { useState, useRef } from 'react'
import { FileUp, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface DropZoneProps {
  onFilesSelected: (files: { name: string; data: Uint8Array; path?: string; size: number }[]) => void
  multiple?: boolean
  title?: string
  subtitle?: string
  compact?: boolean
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  multiple = true,
  title,
  subtitle,
  compact = false
}) => {
  const { t } = useTranslation()
  const displayTitle = title || (compact ? t.dropAddMore : t.dropTitle)
  const displaySubtitle = subtitle

  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.pdf')
    )

    if (droppedFiles.length === 0) return

    setIsLoading(true)
    const resultFiles = await processFileObjects(droppedFiles)
    setIsLoading(false)

    if (resultFiles.length > 0) {
      onFilesSelected(resultFiles)
    }
  }

  const handleClick = async () => {
    if (window.electronAPI && typeof window.electronAPI.openFileDialog === 'function') {
      try {
        const dialogRes = await window.electronAPI.openFileDialog({ multi: multiple })
        if (dialogRes.canceled || dialogRes.filePaths.length === 0) return

        setIsLoading(true)
        const loaded: { name: string; data: Uint8Array; path?: string; size: number }[] = []

        for (const filePath of dialogRes.filePaths) {
          const res = await window.electronAPI.readFile(filePath)
          if (res.success && res.data) {
            const fileName = filePath.split(/[/\\]/).pop() || 'dokumen.pdf'
            const cleanBytes = new Uint8Array(res.data)
            loaded.push({
              name: fileName,
              path: filePath,
              size: cleanBytes.byteLength,
              data: cleanBytes
            })
          }
        }
        setIsLoading(false)

        if (loaded.length > 0) {
          onFilesSelected(loaded)
        }
      } catch (err) {
        console.error('Error opening native file dialog:', err)
        fileInputRef.current?.click()
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const processFileObjects = async (fileList: File[]) => {
    const list = multiple ? fileList : fileList.slice(0, 1)
    const processed: { name: string; data: Uint8Array; path?: string; size: number }[] = []

    for (const file of list) {
      const buffer = await file.arrayBuffer()
      processed.push({
        name: file.name,
        path: (file as any).path,
        size: file.size,
        data: new Uint8Array(buffer)
      })
    }
    return processed
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files).filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    setIsLoading(true)
    const result = await processFileObjects(files)
    setIsLoading(false)
    if (result.length > 0) {
      onFilesSelected(result)
    }
    e.target.value = ''
  }

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`w-full py-4 px-5 border border-dashed rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-zinc-500 dark:border-zinc-400 bg-zinc-100 dark:bg-zinc-800/60'
            : 'border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/60 dark:hover:bg-zinc-850'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <Plus className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {displayTitle}
        </span>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative w-full border border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-900 shadow-xs ring-1 ring-zinc-900/10 dark:ring-zinc-100/10'
          : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/80'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 mb-3 shadow-2xs">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        ) : (
          <FileUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        )}
      </div>

      <h3 className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {isLoading ? t.readingDoc : displayTitle}
      </h3>
      {(isLoading || displaySubtitle) && (
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
          {isLoading ? t.readingDoc : displaySubtitle}
        </p>
      )}

      <div className="mt-4 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs transition-colors flex items-center gap-1.5">
        <Plus className="w-3 h-3 text-zinc-500" />
        {t.dropSelectBtn}
      </div>
    </div>
  )
}
