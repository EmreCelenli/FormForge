"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageState";
import { LANGUAGES } from "@/lib/i18n";

function SunIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M15.5 2.5a8.8 8.8 0 1 0 6 14.2A7.4 7.4 0 0 1 15.5 2.5z" />
    </svg>
  );
}

type Theme = "dark" | "light";

export function Navbar() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { lang, copy, setLang } = useLanguage();

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") setTheme(current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("formforge-theme", next);
  }

  const light = theme === "light";

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-logo">
          <img src="/logo.png" alt="" width={44} height={44} />
        </span>
        <div className="brand-text">
          <span className="brand-name">
            <span className="brand-form">Form</span>
            <span className="brand-forge">Forge</span>
          </span>
          <span className="motto">{copy.motto}</span>
        </div>
      </div>
      <div className="nav-actions">
        <div className="lang-menu" ref={menuRef}>
          <button
            type="button"
            className="theme-toggle lang-toggle"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={copy.language}
            onClick={() => setOpen((value) => !value)}
          >
            {lang}
          </button>
          {open ? (
            <ul className="lang-list" role="listbox" aria-label={copy.language}>
              {LANGUAGES.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === lang}
                    onClick={() => {
                      setLang(item.id);
                      setOpen(false);
                    }}
                  >
                    <span className="lang-code">{item.label}</span>
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-pressed={light}
          aria-label={light ? copy.themeToDark : copy.themeToLight}
        >
          {light ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  );
}
