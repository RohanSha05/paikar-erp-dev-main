// lib/i18n/server.ts
// ❗ এই ফাইলটা কেবল সার্ভার-সাইডে ব্যবহার করবেন (Server Components / Route Handlers)

import { cookies } from 'next/headers';
import { dict, DEFAULT_LOCALE, type Locale } from './dict';

// Server-এ কুকি থেকে read (NEXT: cookies() is async)
export async function getLocaleServer(): Promise<Locale> {
  try {
    const c = await cookies(); // ✅ await is required in latest Next.js
    const v = (c.get('lang')?.value || DEFAULT_LOCALE) as Locale;
    return v === 'en' ? 'en' : 'bn';
  } catch {
    return DEFAULT_LOCALE;
  }
}

// server-side translator (async)
export async function tServer(key: string, lang?: Locale): Promise<string> {
  const l = lang || (await getLocaleServer());
  return dict[l][key] ?? dict.bn[key] ?? dict.en[key] ?? key;
}

// server-side number format (async)
export async function nfServer(
  n: number,
  opt: Intl.NumberFormatOptions = {}
): Promise<string> {
  const lang = await getLocaleServer();
  const tag = lang === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.NumberFormat(tag, opt).format(n);
}
