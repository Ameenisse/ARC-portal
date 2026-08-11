import { useState, useEffect } from 'react';

export type PortalLanguage = 'dhivehi' | 'english';

export function usePortalLanguage() {
  const [lang, setLangState] = useState<PortalLanguage>(() => {
    const saved = localStorage.getItem('portal_lang');
    return (saved === 'english' || saved === 'dhivehi') ? saved : 'dhivehi';
  });

  const setLang = (newLang: PortalLanguage) => {
    localStorage.setItem('portal_lang', newLang);
    setLangState(newLang);
    window.dispatchEvent(new Event('portal-lang-change'));
  };

  useEffect(() => {
    const handleLangChange = () => {
      const saved = localStorage.getItem('portal_lang');
      if (saved === 'english' || saved === 'dhivehi') {
        setLangState(saved);
      }
    };
    window.addEventListener('portal-lang-change', handleLangChange);
    window.addEventListener('storage', handleLangChange);
    return () => {
      window.removeEventListener('portal-lang-change', handleLangChange);
      window.removeEventListener('storage', handleLangChange);
    };
  }, []);

  return {
    lang,
    setLang,
    dir: (lang === 'english' ? 'ltr' : 'rtl') as 'ltr' | 'rtl'
  };
}
