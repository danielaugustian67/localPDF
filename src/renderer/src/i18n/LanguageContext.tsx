import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, Language } from './translations'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (typeof translations)['en']
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('localpdf_lang')
    if (saved === 'id' || saved === 'en') return saved
    return 'en' // Default to crisp English, switchable to concise Indonesian anytime
  })

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('localpdf_lang', newLang)
  }

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: translations[lang]
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = () => useContext(LanguageContext)
