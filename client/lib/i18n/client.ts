// lib/i18n/client.ts
'use client';

import { dict, DEFAULT_LOCALE, type Locale } from './dict';

const LANG_KEY = 'lang';

export function getLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const v = (localStorage.getItem(LANG_KEY) || 'bn') as Locale;
  return v === 'en' ? 'en' : 'bn';
}

export function setLocale(l: Locale) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANG_KEY, l);
  // cookie optional if later SSR needed
  document.cookie = `lang=${l}; path=/; max-age=31536000`;
  window.location.reload();
}

export function t(key: string): string {
  const l = getLocale();
  const parts = key.split('.');
  // deep lookup: e.g., 'dashboard.title'
  let cur: any = dict[l];
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else { cur = null; break; }
  }
  if (typeof cur === 'string') return cur as string;

  // fallback bn -> en -> key
  cur = dict['bn']; for (const p of parts) { if (cur && p in cur) cur = (cur as any)[p]; else { cur = null; break; } }
  if (typeof cur === 'string') return cur as string;

  cur = dict['en']; for (const p of parts) { if (cur && p in cur) cur = (cur as any)[p]; else { cur = null; break; } }
  return (typeof cur === 'string') ? (cur as string) : key;
}

export function nf(n: number, opt: Intl.NumberFormatOptions = {}) {
  const l = getLocale();
  const tag = l === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.NumberFormat(tag, opt).format(n || 0);
}

export type { Locale } from './dict';
