import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface HeaderProps {
  darkMode: boolean
  setDarkMode: (val: boolean) => void
  isMac: boolean
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode, isMac }) => {
  const { lang, setLang, t } = useTranslation()

  return (
    <header
      className={`h-11 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-3 select-none titlebar-drag z-30 ${
        isMac ? 'pl-[78px]' : ''
      }`}
    >
      {/* Title & Brand Image Logo (Pure white, no black container) */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-rose-600 shadow-2xs flex items-center justify-center overflow-hidden">
          <img
            src="./logo.svg"
            alt="LocalPDF Logo"
            className="w-4 h-4 object-contain"
            data-testid="app-logo"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
            LocalPDF
          </span>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">v1.0</span>
        </div>
      </div>

      {/* Right controls: Language Switcher + Theme Toggle */}
      <div className="flex items-center gap-2 titlebar-nodrag">
        {/* Language Segmented Pill */}
        <div className="flex items-center p-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-[10px] font-mono font-semibold">
          <button
            onClick={() => setLang('en')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              lang === 'en'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('id')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              lang === 'id'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            ID
          </button>
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? t.lightMode : t.darkMode}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
          aria-label="Toggle Theme"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  )
}
