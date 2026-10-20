import { uploadAsync, FileSystemUploadType, cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import type { FuelPriceInput, FuelType } from '../types';

export type OcrOutput = {
  prices: FuelPriceInput;
  confidence: number;
  rawText: string;
  error?: string;
};

const FUEL_ORDER: FuelType[] = ['ecopais', 'super', 'diesel'];

const fuelPatterns: Record<FuelType, [RegExp, number][]> = {
  ecopais: [
    [/\bregular\b/i, 1],
    [/\breg\b/i, 0.7],
    [/\bextra\b/i, 1],
    [/\becopais\b/i, 1],
    [/\bcorriente\b/i, 1],
    [/\bgasolina\b/i, 0.8],
    [/\brgl[ae]r\b/i, 0.7],
    [/\brgl\b/i, 0.5],
  ],
  super: [
    [/\bpremium\b/i, 1],
    [/\bprem\b/i, 0.7],
    [/\bsuper\b/i, 1],
    [/\bsup\b/i, 0.6],
    [/\bprm[iu]m\b/i, 0.7],
  ],
  diesel: [
    [/\bdiesel\b/i, 1],
    [/\bdsl\b/i, 0.6],
    [/\bgasoil\b/i, 1],
    [/\bgasoleo\b/i, 1],
    [/\bdi[ez]sel\b/i, 0.8],
    [/\bdsl\b/i, 0.6],
  ],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const stripDiacritics = (value: string): string =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value: string): string =>
  stripDiacritics(value)
    .replace(/\u00A0/g, ' ')
    .replace(/[|¡]/g, 'i')
    .replace(/[“”]/g, '"')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeOcrNumber = (str: string): string =>
  str
    .toUpperCase()
    .replace(/[Oo]/g, '0')
    .replace(/[Bb]/g, '8')
    .replace(/[Ss]/g, '5')
    .replace(/[Zz]/g, '2');

type PriceMatch = { value: number; lineIdx: number; charIdx: number };

const PRICE_REGEX = /(?:\$|usd)?\s*(\d{1,2})\s*([.,'`-])\s*(\d{2,3})\b/gi;

const extractAllPrices = (lines: string[]): PriceMatch[] => {
  const results: PriceMatch[] = [];
  for (let li = 0; li < lines.length; li++) {
    for (const m of lines[li].matchAll(PRICE_REGEX)) {
      const intPart = sanitizeOcrNumber(m[1]);
      const decPart = sanitizeOcrNumber(m[3]);
      const value = Number.parseFloat(`${intPart}.${decPart}`);
      if (!Number.isFinite(value)) continue;
      if (value < 0.1 || value > 99) continue;
      results.push({ value, lineIdx: li, charIdx: m.index ?? 0 });
    }
  }
  return results;
};

type FuelHit = { type: FuelType; score: number; lineIdx: number; charIdx: number };

const detectAllFuels = (lines: string[]): FuelHit[] => {
  const hits: FuelHit[] = [];
  for (let li = 0; li < lines.length; li++) {
    const norm = normalizeText(lines[li]);
    for (const ft of FUEL_ORDER) {
      for (const [re, score] of fuelPatterns[ft]) {
        const m = re.exec(norm);
        if (m) {
          hits.push({ type: ft, score, lineIdx: li, charIdx: m.index });
        }
      }
    }
  }
  return hits;
};

const calculateConfidence = (evidence: Partial<Record<FuelType, { value: number; score: number }>>): number => {
  const scores = FUEL_ORDER.map((ft) => evidence[ft]?.score ?? 0);
  return scores.reduce((a, b) => a + b, 0) / FUEL_ORDER.length;
};

const extractFuelPricesFromText = (text: string): { prices: FuelPriceInput; confidence: number } => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { prices: {}, confidence: 0 };

  const prices = extractAllPrices(lines);
  const fuels = detectAllFuels(lines);

  const evidence: Partial<Record<FuelType, { value: number; score: number }>> = {};

  // Detect layout: are all fuel names before all prices? (block layout)
  const fuelLines = fuels.map((f) => f.lineIdx);
  const priceLines = prices.map((p) => p.lineIdx);
  const isBlockLayout =
    fuels.length > 0 && prices.length > 0 && Math.max(...fuelLines) < Math.min(...priceLines);

  if (isBlockLayout) {
    // Block layout: pair unique fuels and prices in order of appearance (1-to-1)
    const uniqueFuels: FuelType[] = [];
    const seenFuel = new Set<FuelType>();
    for (const f of [...fuels].sort((a, b) => a.lineIdx - b.lineIdx || a.charIdx - b.charIdx)) {
      if (!seenFuel.has(f.type)) {
        seenFuel.add(f.type);
        uniqueFuels.push(f.type);
      }
    }

    const sortedPrices = [...prices].sort((a, b) => a.lineIdx - b.lineIdx || a.charIdx - b.charIdx);

    for (let i = 0; i < uniqueFuels.length && i < sortedPrices.length; i++) {
      evidence[uniqueFuels[i]] = { value: sortedPrices[i].value, score: 0.7 };
    }
  } else {
    // Interleaved layout: proximity matching with price deduplication
    const usedPriceKeys = new Set<string>();

    for (const f of [...fuels].sort((a, b) => a.lineIdx - b.lineIdx || a.charIdx - b.charIdx)) {
      let best: { value: number; dist: number; key: string } | null = null;
      for (const p of prices) {
        const priceKey = `${p.lineIdx}:${p.charIdx}`;
        if (usedPriceKeys.has(priceKey)) continue;
        const dist = Math.abs(p.lineIdx - f.lineIdx);
        if (dist > 2) continue;
        const onSame = p.lineIdx === f.lineIdx ? Math.abs(p.charIdx - f.charIdx) : 999;
        const effectiveDist = onSame < 10 ? 0 : dist;
        if (!best || effectiveDist < best.dist) {
          best = { value: p.value, dist: effectiveDist, key: priceKey };
        }
      }

      if (best) {
        usedPriceKeys.add(best.key);
        const matchScore = 0.9 * f.score * (best.dist === 0 ? 1 : best.dist === 1 ? 0.85 : 0.7);
        const existing = evidence[f.type];
        if (!existing || matchScore > existing.score) {
          evidence[f.type] = { value: best.value, score: matchScore };
        }
      }
    }
  }

  // 2) Fill missing by sorted-price ordering
  const used = new Set(FUEL_ORDER.filter((ft) => evidence[ft]).map((ft) => evidence[ft]!.value));
  const remaining = prices.filter((p) => !used.has(p.value)).map((p) => p.value);
  remaining.sort((a, b) => a - b);

  let ri = 0;
  for (const ft of FUEL_ORDER) {
    if (evidence[ft]) continue;
    if (ri < remaining.length) {
      evidence[ft] = { value: remaining[ri++], score: 0.45 };
    }
  }

  // 3) Final fallback: no hints at all → order all prices by fuel order
  const hasAnyFuel = fuels.length > 0;
  if (!hasAnyFuel && prices.length >= 2) {
    const sorted = [...new Set(prices.map((p) => p.value))].sort((a, b) => a - b);
    for (let i = 0; i < FUEL_ORDER.length && i < sorted.length; i++) {
      evidence[FUEL_ORDER[i]] = { value: sorted[i], score: 0.4 };
    }
  }

  const result: FuelPriceInput = {};
  for (const ft of FUEL_ORDER) {
    if (evidence[ft]) result[ft] = evidence[ft]!.value;
  }

  return { prices: result, confidence: calculateConfidence(evidence) };
};

const OCR_SPACE_API_KEY = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY ?? '';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

const callOcrSpace = async (imageUri: string): Promise<string> => {
  if (!OCR_SPACE_API_KEY) {
    throw new Error('OCR_SPACE_API_KEY not configured');
  }

  // Copy content:// to file:// (uploadAsync needs file:// on Android)
  let fileUri: string;
  if (imageUri.startsWith('content://')) {
    const dest = cacheDirectory + 'ocr_' + Date.now() + '.jpg';
    try {
      await copyAsync({ from: imageUri, to: dest });
      fileUri = dest;
    } catch (copyErr) {
      throw new Error(`Failed to copy image: ${formatError(copyErr)}`);
    }
  } else {
    fileUri = imageUri;
  }

  let uploadResult;
  try {
    uploadResult = await uploadAsync(OCR_SPACE_URL, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'image/jpeg',
      parameters: {
        apikey: OCR_SPACE_API_KEY,
        OCREngine: '3',
        language: 'spa',
        scale: 'true',
        isTable: 'true',
      },
    });
  } catch (fetchErr) {
    throw new Error(`OCR.space network error: ${formatError(fetchErr)}`);
  }

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`OCR.space error ${uploadResult.status}: ${uploadResult.body.slice(0, 500)}`);
  }

  let json: any;
  try {
    json = JSON.parse(uploadResult.body);
  } catch (jsonErr) {
    throw new Error(`OCR.space invalid response: ${formatError(jsonErr)}`);
  }

  if (json.IsErroredOnProcessing) {
    const errorMsg = json.ErrorMessage?.[0]?.ErrorMessage ?? 'Unknown processing error';
    throw new Error(`OCR.space processing error: ${errorMsg}`);
  }

  return json.ParsedResults?.[0]?.ParsedText ?? '';
};

export const runOcrWithRetries = async (
  imageUri: string,
  minConfidence = 0.6,
  maxRetries = 2,
): Promise<{ output: OcrOutput; manualFallback: boolean }> => {
  let attempt = 0;
  let best: OcrOutput = { prices: {}, confidence: 0, rawText: '' };
  let lastError: string | undefined;

  while (attempt <= maxRetries) {
    try {
      const rawText = await callOcrSpace(imageUri);

      const { prices, confidence } = extractFuelPricesFromText(rawText);

      const output: OcrOutput = {
        prices,
        confidence,
        rawText,
      };

      if (
        confidence > best.confidence ||
        (confidence === best.confidence && rawText.length > best.rawText.length)
      ) {
        best = output;
      }

      if (confidence >= minConfidence) {
        return { output, manualFallback: false };
      }
    } catch (error) {
      lastError = formatError(error);
      console.error('[OCR] Attempt failed:', lastError);
      if (attempt === maxRetries) break;
    }

    attempt += 1;

    if (attempt <= maxRetries) {
      await sleep(120 * attempt);
    }
  }

  if (lastError && best.confidence === 0) {
    best.error = lastError;
  }

  return {
    output: best,
    manualFallback: true,
  };
};
