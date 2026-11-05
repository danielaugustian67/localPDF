import React from 'react'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  Files,
  Split,
  LayoutTemplate,
  Minimize2,
  Image as ImageIcon,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileCode2,
  Images,
  LockKeyholeOpen,
  Wrench,
  GitCompare,
  HelpCircle,
  HardDrive,
  Printer,
  ShieldCheck,
  ScanText
} from 'lucide-react'

export type TabType =
  | 'merge'
  | 'split'
  | 'edit'
  | 'nup'
  | 'compare'
  | 'ocr'
  | 'pdf-to-docx'
  | 'pdf-to-excel'
  | 'pdf-to-text'
  | 'extract-img'
  | 'img-to-pdf'
  | 'pdf-to-img'
  | 'compress'
  | 'unlock'
  | 'repair'
  | 'metadata'
  | 'about'

interface SidebarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation()

  const coreTools = [
    {
      id: 'merge' as TabType,
      label: t.merge,
      hint: t.mergeHint,
      icon: Files
    },
    {
      id: 'split' as TabType,
      label: t.split,
      hint: t.splitHint,
      icon: Split
    },
    {
      id: 'edit' as TabType,
      label: t.edit,
      hint: t.editHint,
      icon: LayoutTemplate
    },
    {
      id: 'nup' as TabType,
      label: t.nup,
      hint: t.nupHint,
      icon: Printer
    },
    {
      id: 'compare' as TabType,
      label: t.compare,
      hint: t.compareHint,
      icon: GitCompare
    }
  ]

  const conversionTools = [
    {
      id: 'ocr' as TabType,
      label: t.ocrPdf,
      hint: t.ocrPdfHint,
      icon: ScanText
    },
    {
      id: 'pdf-to-docx' as TabType,
      label: t.pdfToDocx,
      hint: t.pdfToDocxHint,
      icon: FileText
    },
    {
      id: 'pdf-to-excel' as TabType,
      label: t.pdfToExcel,
      hint: t.pdfToExcelHint,
      icon: FileSpreadsheet
    },
    {
      id: 'pdf-to-text' as TabType,
      label: t.pdfToText,
      hint: t.pdfToTextHint,
      icon: FileCode2
    },
    {
      id: 'extract-img' as TabType,
      label: t.extractImg,
      hint: t.extractImgHint,
      icon: Images
    },
    {
      id: 'img-to-pdf' as TabType,
      label: t.imgToPdf,
      hint: t.imgToPdfHint,
      icon: ImageIcon
    },
    {
      id: 'pdf-to-img' as TabType,
      label: t.pdfToImg,
      hint: t.pdfToImgHint,
      icon: FileImage
    }
  ]

  const securityTools = [
    {
      id: 'compress' as TabType,
      label: t.compress,
      hint: t.compressHint,
      icon: Minimize2
    },
    {
      id: 'unlock' as TabType,
      label: t.unlock,
      hint: t.unlockHint,
      icon: LockKeyholeOpen
    },
    {
      id: 'repair' as TabType,
      label: t.repair,
      hint: t.repairHint,
      icon: Wrench
    },
    {
      id: 'metadata' as TabType,
      label: t.metadata,
      hint: t.metadataHint,
      icon: ShieldCheck
    }
  ]

  return (
    <aside className="w-64 h-full border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/50 backdrop-blur-xl flex flex-col justify-between p-3 select-none shrink-0 overflow-y-auto">
      <div className="space-y-4">
        {/* Core Documents */}
        <div>
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            {t.catDocument}
          </div>

          <div className="space-y-0.5 mt-1">
            {coreTools.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-sm transition-all duration-150 ${isActive
                    ? 'bg-zinc-250/90 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50 font-semibold shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 font-medium'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive
                        ? 'text-zinc-950 dark:text-zinc-50'
                        : 'text-zinc-400 dark:text-zinc-400'
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono tracking-tight px-1.5 py-0.5 rounded ${isActive
                      ? 'bg-zinc-300/50 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                  >
                    {item.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Conversion Tools */}
        <div>
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            {t.catConversion}
          </div>

          <div className="space-y-0.5 mt-1">
            {conversionTools.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-sm transition-all duration-150 ${isActive
                    ? 'bg-zinc-250/90 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50 font-semibold shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 font-medium'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive
                        ? 'text-zinc-950 dark:text-zinc-50'
                        : 'text-zinc-400 dark:text-zinc-400'
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono tracking-tight px-1.5 py-0.5 rounded ${isActive
                      ? 'bg-zinc-300/50 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                  >
                    {item.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Security & Tools */}
        <div>
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            {t.catSecurity}
          </div>

          <div className="space-y-0.5 mt-1">
            {securityTools.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-sm transition-all duration-150 ${isActive
                    ? 'bg-zinc-250/90 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50 font-semibold shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 font-medium'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive
                        ? 'text-zinc-950 dark:text-zinc-50'
                        : 'text-zinc-400 dark:text-zinc-400'
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono tracking-tight px-1.5 py-0.5 rounded ${isActive
                      ? 'bg-zinc-300/50 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                  >
                    {item.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="space-y-1 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <button
          onClick={() => setActiveTab('about')}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-colors ${activeTab === 'about'
            ? 'bg-zinc-250/90 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50 font-semibold shadow-2xs'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 font-medium'
            }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span>{t.about}</span>
        </button>

        <div className="px-3 py-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </div>
      </div>
    </aside>
  )
}
