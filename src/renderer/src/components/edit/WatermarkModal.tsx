import React from 'react'
import { WatermarkOptions } from '../../types'
import { X, Stamp } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface WatermarkModalProps {
  isOpen: boolean
  onClose: () => void
  options: WatermarkOptions
  onChange: (opt: WatermarkOptions) => void
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  options,
  onChange
}) => {
  if (!isOpen) return null
  const { t, lang } = useTranslation()

  const presets = lang === 'id'
    ? ['RAHASIA', 'DRAFT', 'SALINAN', 'LUNAS']
    : ['CONFIDENTIAL', 'DRAFT', 'COPY', 'PAID']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            <Stamp className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>{t.watermarkTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Active switch */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-700/80">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">{t.enableWatermark}</p>
              <p className="text-[11px] text-zinc-400">{t.watermarkDesc}</p>
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
              {/* Text input */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                  {t.watermarkText}
                </label>
                <input
                  type="text"
                  value={options.text}
                  onChange={(e) => onChange({ ...options, text: e.target.value })}
                  placeholder={lang === 'id' ? 'Misal: RAHASIA' : 'e.g. CONFIDENTIAL'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
                />

                <div className="flex gap-1 mt-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onChange({ ...options, text: p })}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity & Size */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-1">
                    <span>{t.opacity}</span>
                    <span>{Math.round(options.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={options.opacity}
                    onChange={(e) => onChange({ ...options, opacity: parseFloat(e.target.value) })}
                    className="w-full cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-1">
                    <span>{t.watermarkSize}</span>
                    <span>{options.fontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="72"
                    step="2"
                    value={options.fontSize}
                    onChange={(e) => onChange({ ...options, fontSize: parseInt(e.target.value, 10) })}
                    className="w-full cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </div>
              </div>

              {/* Rotation & Color */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                    {t.angleRotation}
                  </label>
                  <select
                    value={options.rotation}
                    onChange={(e) => onChange({ ...options, rotation: parseInt(e.target.value, 10) })}
                    className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none"
                  >
                    <option value={45}>Diagonal (45°)</option>
                    <option value={0}>Horizontal (0°)</option>
                    <option value={-45}>Diagonal (-45°)</option>
                    <option value={90}>Vertical (90°)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                    {t.color}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={options.color}
                      onChange={(e) => onChange({ ...options, color: e.target.value })}
                      className="w-7 h-7 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">{options.color}</span>
                  </div>
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
