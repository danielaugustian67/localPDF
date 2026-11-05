import React, { useState, useEffect } from 'react'
import { Header } from './components/common/Header'
import { Sidebar, TabType } from './components/common/Sidebar'
import { MergeView } from './components/merge/MergeView'
import { SplitView } from './components/split/SplitView'
import { EditView } from './components/edit/EditView'
import { CompressView } from './components/compress/CompressView'
import { ImageToPdfView } from './components/imageToPdf/ImageToPdfView'
import { PdfToImageView } from './components/pdfToImage/PdfToImageView'
import { PdfToDocxView } from './components/pdfToDocx/PdfToDocxView'
import { PdfToExcelView } from './components/pdfToExcel/PdfToExcelView'
import { PdfToTextView } from './components/pdfToText/PdfToTextView'
import { ExtractImagesView } from './components/extractImages/ExtractImagesView'
import { UnlockPdfView } from './components/unlock/UnlockPdfView'
import { RepairPdfView } from './components/repair/RepairPdfView'
import { ComparePdfView } from './components/compare/ComparePdfView'
import { MetadataView } from './components/metadata/MetadataView'
import { NUpView } from './components/nup/NUpView'
import { OcrPdfView } from './components/ocr/OcrPdfView'
import { AboutView } from './components/about/AboutView'

import { LanguageProvider } from './i18n/LanguageContext'

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('merge')
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  })
  const [isMac, setIsMac] = useState<boolean>(true)

  // Listen to OS theme changes dynamically (same as system default)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // Detect platform from Electron API
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getPlatform === 'function') {
      window.electronAPI.getPlatform().then((p) => {
        setIsMac(p === 'darwin')
      })
    } else {
      setIsMac(navigator.userAgent.includes('Mac'))
    }
  }, [])

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header darkMode={darkMode} setDarkMode={setDarkMode} isMac={isMac} />

      {/* Main Workspace Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Content View */}
        <main className="flex-1 h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          {activeTab === 'merge' && <MergeView />}
          {activeTab === 'split' && <SplitView />}
          {activeTab === 'edit' && <EditView />}
          {activeTab === 'nup' && <NUpView />}
          {activeTab === 'compare' && <ComparePdfView />}

          {activeTab === 'ocr' && <OcrPdfView />}
          {activeTab === 'pdf-to-docx' && <PdfToDocxView />}
          {activeTab === 'pdf-to-excel' && <PdfToExcelView />}
          {activeTab === 'pdf-to-text' && <PdfToTextView />}
          {activeTab === 'extract-img' && <ExtractImagesView />}
          {activeTab === 'img-to-pdf' && <ImageToPdfView />}
          {activeTab === 'pdf-to-img' && <PdfToImageView />}

          {activeTab === 'compress' && <CompressView />}
          {activeTab === 'unlock' && <UnlockPdfView />}
          {activeTab === 'repair' && <RepairPdfView />}
          {activeTab === 'metadata' && <MetadataView />}

          {activeTab === 'about' && <AboutView />}
        </main>
      </div>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
