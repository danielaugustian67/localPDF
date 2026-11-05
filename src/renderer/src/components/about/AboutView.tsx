import React from 'react'
import { ShieldCheck, Check } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

export const AboutView: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-8 max-w-2xl mx-auto space-y-6 select-text text-zinc-800 dark:text-zinc-200">
      {/* Brand Header */}
      <div className="pb-5 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base tracking-tight text-zinc-950 dark:text-zinc-50">
            LocalPDF
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            v1.0.0 (macOS & Windows)
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.aboutSubtitle}
        </p>
      </div>

      {/* Security Architecture Principle */}
      <div className="p-4 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t.securityTitle}</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t.securityDesc}
        </p>

        <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Zero Outbound Traffic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Isolated IPC Context</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>No Telemetry / Tracking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Strict CSP Enforced</span>
          </div>
        </div>
      </div>

      {/* Tech Specifications */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {t.techSpecs}
        </h3>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900">
            <span className="text-zinc-500 font-mono text-[11px]">Runtime Shell</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">Electron v34 + Chromium</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900">
            <span className="text-zinc-500 font-mono text-[11px]">PDF Engine</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">pdf-lib v1.17.1 (Pure JS)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900">
            <span className="text-zinc-500 font-mono text-[11px]">Renderer Stack</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">React 18 + Vite 5 + Tailwind</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900">
            <span className="text-zinc-500 font-mono text-[11px]">Thumbnail Engine</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">Mozilla PDF.js (Local Worker)</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
        <span>LocalPDF Desktop</span>
        <span>Standalone Sandbox</span>
      </div>
    </div>
  )
}
