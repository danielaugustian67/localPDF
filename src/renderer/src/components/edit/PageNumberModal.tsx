import React from 'react'
import { PageNumberOptions } from '../../types'
import { X, Hash } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface PageNumberModalProps {
  isOpen: boolean
  onClose: () => void
  options: PageNumberOptions
  onChange: (opt: PageNumberOptions) => void
}

export const PageNumberModal: React.FC<PageNumberModalProps> = ({
  isOpen,
  onClose,
  options,
  onChange
}) => {
  if (!isOpen) return null
  const { t } = useTranslation()

  const positions = [
    { id: 'top-left', label: t.posTopLeft },
    { id: 'top-center', label: t.posTopCenter },
    { id: 'top-right', label: t.posTopRight },
    { id: 'bottom-left', label: t.posBottomLeft },
    { id: 'bottom-center', label: t.posBottomCenter },
    { id: 'bottom-right', label: t.posBottomRight }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            <Hash className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>{t.pageNumberTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Active switch */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-700/80">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">{t.enablePageNumber}</p>
              <p className="text-[11px] text-zinc-400">{t.pageNumberDesc}</p>
            </div>
            <input
              type="checkbox"
              checked={options.enabled}
              onChange={(e) => onChange({ ...options, enabled: e.target.checked })}
              className="w-4 h-4 text-zinc-900 rounded focus:ring-0 cursor-pointer"
            />
          </div>

          {options.enabled && (
            <>
              {/* Position Matrix */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                  {t.pagePosition}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {positions.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => onChange({ ...options, position: pos.id as any })}
                      className={`py-1.5 px-1 rounded-md border text-center text-[10px] font-mono transition-all ${
                        options.position === pos.id
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-500 mb-1.5">
                  {t.labelFormat}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ ...options, format: 'number' })}
                    className={`py-1.5 px-2.5 rounded-md border text-left text-[11px] font-mono transition-all ${
                      options.format === 'number'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.formatNumberOnly}
                  </button>

                  <button
                    type="button"
                    onClick={() => onChange({ ...options, format: 'page-of-total' })}
                    className={`py-1.5 px-2.5 rounded-md border text-left text-[11px] font-mono transition-all ${
                      options.format === 'page-of-total'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.formatPageOfTotal}
                  </button>
                </div>
              </div>

              {/* Start & Font Size */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                    {t.startFrom}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={options.startFrom}
                    onChange={(e) => onChange({ ...options, startFrom: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                    {t.fontSize}
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={options.fontSize}
                    onChange={(e) => onChange({ ...options, fontSize: parseInt(e.target.value, 10) || 10 })}
                    className="w-full px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            {t.apply}
          </button>
        </div>
      </div>
    </div>
  )
}
