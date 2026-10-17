"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { COPY, isLang, type Copy, type LangId } from "@/lib/i18n";

type LanguageValue = {
  lang: LangId;
  copy: Copy;
  setLang: (lang: LangId) => void;
};

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangId>("en");

  useEffect(() => {
    const stored = localStorage.getItem("formforge-lang");
    if (isLang(stored)) setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      copy: COPY[lang],
      setLang(next) {
        setLangState(next);
        localStorage.setItem("formforge-lang", next);
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("Language state is missing.");
  return value;
}
