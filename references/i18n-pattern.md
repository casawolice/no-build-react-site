# Adding client-side i18n

Optional pattern for multi-language no-build React sites — a React context
wrapping a `fetch()`-loaded JSON dictionary per locale, with a `t(key)` hook.
No new vendored dependencies needed; it's plain React + `fetch`.

## Files

```
src/i18n/
  constants.ts        SUPPORTED_LOCALES, locale detection, labels
  I18nContext.tsx      I18nProvider + useI18n() hook
assets/i18n/
  en.json              flat key -> translated string
  zh.json
  ...
```

## `src/i18n/constants.ts`

```ts
export const SUPPORTED_LOCALES = ["en", "zh"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const STORAGE_KEY = "app_locale";

function systemLocale(): string {
  return (navigator.language || "").toLowerCase();
}

// Priority: cached user choice -> browser/system language -> default.
export function detectLocale(): Locale {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached && (SUPPORTED_LOCALES as readonly string[]).includes(cached)) return cached as Locale;
  const short = systemLocale().split("-")[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(short)) return short as Locale;
  return DEFAULT_LOCALE;
}
```

## `src/i18n/I18nContext.tsx`

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, STORAGE_KEY, SUPPORTED_LOCALES, detectLocale, type Locale } from "./constants.ts";

type Dict = Record<string, string>;
interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  ready: boolean;
}
const I18nContext = createContext<I18nContextValue | null>(null);
const dictCache = new Map<Locale, Promise<Dict>>();

function loadDict(locale: Locale): Promise<Dict> {
  if (!dictCache.has(locale)) {
    dictCache.set(locale, fetch(`assets/i18n/${locale}.json`).then((r) => r.json()));
  }
  return dictCache.get(locale)!;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  const [dict, setDict] = useState<Dict>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadDict(locale).then((d) => {
      if (!cancelled) {
        setDict(d);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => {
    const resolved = SUPPORTED_LOCALES.includes(next) ? next : DEFAULT_LOCALE;
    localStorage.setItem(STORAGE_KEY, resolved);
    setLocaleState(resolved);
  };

  const t = (key: string) => dict[key] ?? key;
  const value = useMemo(() => ({ locale, setLocale, t, ready }), [locale, dict, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
```

## Usage in a component

```tsx
import { useI18n } from "../i18n/I18nContext.tsx";

export function Header() {
  const { t, locale, setLocale } = useI18n();
  return (
    <header>
      <span>{t("nav.home")}</span>
      <button onClick={() => setLocale(locale === "en" ? "zh" : "en")}>
        {locale === "en" ? "中文" : "English"}
      </button>
    </header>
  );
}
```

Wrap `<App />` in `<I18nProvider>` once, in `src/App.tsx`, above the router.

## Embedded HTML in a translation value

If a dictionary value needs to contain markup (e.g. a `<strong>` or a mailto
link translators shouldn't have to reconstruct), add a second accessor next to
`t()` that returns a `dangerouslySetInnerHTML`-shaped object, and use a
`data-i18n-html`-style naming convention in your keys to remember which values
need it:

```ts
const th = (key: string) => ({ __html: dict[key] ?? key });
// usage: <p dangerouslySetInnerHTML={th("privacy.contact")} />
```

## SEO note

Because translations load client-side after JS runs, a crawler that doesn't
execute JavaScript only ever sees whatever static text is in `index.html`
before React hydrates it. If SEO matters, put a bilingual (or default-locale)
`<title>` and `<meta name="description">` directly in `index.html`'s `<head>`
as a static fallback, and have each page update `document.title` /
`meta[name=description]` after the dictionary loads (via a small `usePageMeta`
hook) for JS-executing crawlers and the browser tab. A single index.html can't
give every route a distinct static `<title>` the way separate pages could —
that's a real trade-off of the SPA approach, worth surfacing to whoever's
deciding on it rather than silently accepting the SEO regression.
