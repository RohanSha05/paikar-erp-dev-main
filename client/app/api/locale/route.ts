import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'bn';

  const res = NextResponse.json({ ok: true, lang });
  // 180 days
  res.cookies.set('lang', lang, { httpOnly: false, maxAge: 60 * 60 * 24 * 180, path: '/' });
  return res;
}
