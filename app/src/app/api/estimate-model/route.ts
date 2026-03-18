import { NextRequest, NextResponse } from 'next/server';

const FILAMENT_COST_PER_GRAM = 0.08; // ₪ per gram
const PRINT_COST_PER_HOUR = 5;       // ₪ per hour
const MARGIN = 1.3;                   // 30% margin

function parseMakerWorldId(url: string): string | null {
  // https://makerworld.com/en/models/12345 or /models/12345-...
  const match = url.match(/makerworld\.com\/(?:[a-z]{2}\/)?models\/(\d+)/i);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL נדרש' }, { status: 400 });
    }

    const modelId = parseMakerWorldId(url);
    if (!modelId) {
      return NextResponse.json({ error: 'URL לא מזוהה כקישור MakerWorld' }, { status: 400 });
    }

    // Try MakerWorld API
    const apiRes = await fetch(`https://makerworld.com/api/v1/design-service/design/${modelId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://makerworld.com/',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!apiRes.ok) {
      return NextResponse.json({ error: 'לא ניתן לאחזר נתוני המודל' }, { status: 502 });
    }

    const data = await apiRes.json();

    // Extract model info - MakerWorld API structure
    const designInfo = data?.designInfo || data;
    const title = designInfo?.title || designInfo?.name || 'מודל לא ידוע';

    // Print profile data (first profile if exists)
    const profiles = data?.printProfiles || data?.profiles || [];
    const firstProfile = profiles[0];

    let printTimeSec: number | null = null;
    let filamentGrams: number | null = null;
    let materialName: string | null = null;

    if (firstProfile) {
      printTimeSec = firstProfile?.printTime || firstProfile?.estimatedTime || null;
      // filament weight — may be in grams or mm³
      const weight = firstProfile?.weight || firstProfile?.filamentWeight;
      if (weight) filamentGrams = typeof weight === 'number' ? weight : parseFloat(weight);
      materialName = firstProfile?.material || firstProfile?.filamentType || null;
    }

    // Fallback: try nested structure
    if (!filamentGrams && data?.designFiles) {
      for (const f of data.designFiles) {
        if (f?.weight) { filamentGrams = f.weight; break; }
        if (f?.printTime) { printTimeSec = f.printTime; break; }
      }
    }

    // Calculate estimate
    let estimatedPrice: number | null = null;
    let breakdown: Record<string, number> = {};

    if (filamentGrams || printTimeSec) {
      const filamentCost = filamentGrams ? filamentGrams * FILAMENT_COST_PER_GRAM : 0;
      const printHours = printTimeSec ? printTimeSec / 3600 : 0;
      const printCost = printHours * PRINT_COST_PER_HOUR;
      estimatedPrice = Math.ceil((filamentCost + printCost) * MARGIN);
      breakdown = { filamentCost: Math.round(filamentCost), printCost: Math.round(printCost) };
    }

    return NextResponse.json({
      title,
      modelId,
      printTimeSec,
      printTimeFormatted: printTimeSec ? formatTime(printTimeSec) : null,
      filamentGrams: filamentGrams ? Math.round(filamentGrams) : null,
      materialName,
      estimatedPrice,
      breakdown,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return NextResponse.json({ error: 'הבקשה פגה — נסה שוב' }, { status: 504 });
    }
    return NextResponse.json({ error: 'שגיאה בחיבור ל-MakerWorld' }, { status: 500 });
  }
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ש' ${m}ד'`;
  return `${m}ד'`;
}
