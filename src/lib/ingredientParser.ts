import { Ingredient } from './types';

// Units in French and English
const UNIT_MAP: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gramme: 'g',
  grammes: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogramme: 'kg',
  kilogrammes: 'kg',
  ml: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  cl: 'cl',
  centilitre: 'cl',
  centilitres: 'cl',
  dl: 'dl',
  l: 'L',
  litre: 'L',
  litres: 'L',
  càs: 'c. à soupe',
  cas: 'c. à soupe',
  'c. à soupe': 'c. à soupe',
  'cuillère à soupe': 'c. à soupe',
  'cuillères à soupe': 'c. à soupe',
  tbsp: 'c. à soupe',
  càc: 'c. à café',
  cac: 'c. à café',
  'c. à café': 'c. à café',
  'cuillère à café': 'c. à café',
  'cuillères à café': 'c. à café',
  tsp: 'c. à café',
  pincée: 'pincée',
  pincées: 'pincée',
  pinch: 'pincée',
  gousse: 'gousse',
  gousses: 'gousses',
  clove: 'gousse',
  cloves: 'gousses',
  tranche: 'tranche',
  tranches: 'tranches',
  slice: 'tranche',
  slices: 'tranches',
  morceau: 'morceau',
  morceaux: 'morceaux',
  piece: 'pièce',
  pieces: 'pièces',
  pièce: 'pièce',
  pièces: 'pièces',
  feuille: 'feuille',
  feuilles: 'feuilles',
  verre: 'verre',
  verres: 'verres',
  tasse: 'tasse',
  tasses: 'tasses',
  cup: 'tasse',
  cups: 'tasses',
  botte: 'botte',
  bottes: 'bottes',
  bouquet: 'bouquet',
  bouquets: 'bouquets',
  sachet: 'sachet',
  sachets: 'sachets',
  boite: 'boîte',
  boîte: 'boîte',
  boîtes: 'boîtes',
  can: 'boîte',
  pot: 'pot',
  pots: 'pots',
  poignée: 'poignée',
  poignées: 'poignées',
  filet: 'filet',
  filets: 'filets',
  brique: 'brique',
  briques: 'briques',
  bâton: 'bâton',
  bâtons: 'bâtons',
};

const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  demi: 0.5,
  demie: 0.5,
  'un demi': 0.5,
  'une demie': 0.5,
  'un quart': 0.25,
  'trois quarts': 0.75,
};

// Converts fractions like "1/2", "3/4", "1 1/2", "½" to decimal numbers
export function parseFraction(str: string): number | undefined {
  const vulgarMap: Record<string, number> = {
    '½': 0.5,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '¼': 0.25,
    '¾': 0.75,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 1 / 6,
    '⅚': 5 / 6,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  };

  const trimmed = str.trim().toLowerCase();
  if (vulgarMap[trimmed]) return vulgarMap[trimmed];
  if (WORD_NUMBERS[trimmed]) return WORD_NUMBERS[trimmed];

  // Fraction like 1/2 or 3/4
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) return num / den;
  }

  // Mixed like 1 1/2
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den !== 0) return whole + (num / den);
  }

  // Decimal with comma or dot (e.g. "1,5" -> 1.5)
  const decMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)$/);
  if (decMatch) {
    return parseFloat(decMatch[1].replace(',', '.'));
  }

  return undefined;
}

export function parseIngredient(raw: any, id: string): Ingredient {
  // If already an object with quantity/unit/name
  if (typeof raw === 'object' && raw !== null) {
    const rawName = raw.name || raw.ingredient || raw.item || raw.text;
    const rawQty = raw.quantity ?? raw.amount ?? raw.qty;
    const rawUnit = raw.unit ?? raw.measure;

    if (rawName && (rawQty !== undefined || rawUnit)) {
      let q: number | undefined = undefined;
      let u = rawUnit ? String(rawUnit).trim() : undefined;

      if (typeof rawQty === 'number') {
        q = rawQty;
      } else if (rawQty !== undefined && rawQty !== null && String(rawQty).trim() !== '') {
        const qtyStr = String(rawQty).trim();
        const parsedFromQty = parseIngredient(qtyStr, id);
        if (parsedFromQty.quantity !== undefined) {
          q = parsedFromQty.quantity;
          if (!u && parsedFromQty.unit) u = parsedFromQty.unit;
        } else {
          q = parseFraction(qtyStr);
        }
      }

      const n = String(rawName).trim();
      return {
        id: raw.id || id,
        raw: raw.raw || `${q !== undefined ? q + ' ' : ''}${u ? u + ' ' : ''}${n}`.trim(),
        quantity: q,
        unit: u,
        name: n,
      };
    }
    raw = raw.raw || raw.name || raw.text || raw.ingredient || raw.item || '';
  }

  const rawStr = String(raw || '');
  // Strip emojis, bullets, and dashes at beginning
  // NOTE: \p{Extended_Pictographic} matches emojis WITHOUT matching digits 0-9
  let cleaned = rawStr
    .trim()
    .replace(/^[\p{Extended_Pictographic}\s\-\*•–]+/u, '')
    .trim();

  if (!cleaned) {
    return { id, raw: rawStr, name: rawStr };
  }

  // First check if string starts with written words like "une cuillère...", "deux oeufs", "un demi citron"
  const wordPrefixMatch = cleaned.match(
    /^(un\s+demi|une\s+demie|un\s+quart|trois\s+quarts|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|demi|demie)\s+(.*)$/i
  );

  let quantity: number | undefined = undefined;
  let rest = cleaned;

  if (wordPrefixMatch) {
    quantity = WORD_NUMBERS[wordPrefixMatch[1].toLowerCase()];
    rest = wordPrefixMatch[2].trim();
  } else {
    // Match numeric prefix
    const prefixMatch = cleaned.match(
      /^((?:\d+\s+\d+\/\d+)|(?:\d+[\.,]\d+)|(?:\d+\/\d+)|(?:[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+))\s*(.*)$/
    );

    if (prefixMatch) {
      const quantityStr = prefixMatch[1];
      rest = prefixMatch[2].trim();
      quantity = parseFraction(quantityStr);
    }
  }

  if (quantity === undefined && rest === cleaned) {
    return {
      id,
      raw: cleaned,
      name: cleaned,
    };
  }

  // Now inspect the start of 'rest' for units
  let unit: string | undefined = undefined;
  let ingredientName = rest;

  // Try matching composite units first
  const compositeMatches = [
    /^(?:c\.?\s*à\s*s\.?|cuill[eè]res?\s+à\s+soupe|cas|càs|tbsp)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:c\.?\s*à\s*c\.?|cuill[eè]res?\s+à\s+caf[eé]|cac|càc|tsp)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:pinc[eé]es?|pinch)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:gousses?|cloves?)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:tranches?|slices?)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:morceaux?|pi[eè]ces?)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:poign[eé]es?|filets?|briques?|b[aâ]tons?)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
    /^(?:feuilles?|verres?|tasses?|cups?|bottes?|bouquets?|sachets?|bo[iî]tes?|pots?)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i,
  ];

  let matchedComposite = false;
  for (const pattern of compositeMatches) {
    const m = rest.match(pattern);
    if (m) {
      const matchedUnitPart = rest.slice(0, rest.length - m[1].length).trim();
      const cleanUnitPart = matchedUnitPart
        .toLowerCase()
        .replace(/^(?:d['’]|de\s+|du\s+|des\s+)/, '')
        .replace(/(?:d['’]|de|du|des)$/, '')
        .trim();
      unit = UNIT_MAP[cleanUnitPart] || matchedUnitPart;
      ingredientName = m[1].trim();
      matchedComposite = true;
      break;
    }
  }

  if (!matchedComposite) {
    // Check single word unit: e.g. "g de farine", "kg pommes", "ml de lait"
    const singleWordMatch = rest.match(/^([a-zA-Z%]+)\s+(?:d['’]|de\s+|du\s+|des\s+)?(.*)$/i);
    if (singleWordMatch) {
      const candidateUnit = singleWordMatch[1].toLowerCase();
      if (UNIT_MAP[candidateUnit]) {
        unit = UNIT_MAP[candidateUnit];
        ingredientName = singleWordMatch[2].trim();
      } else {
        // Not a known unit (e.g. "2 pommes"), check if rest starts with de/d'
        const deMatch = rest.match(/^(?:d['’]|de\s+|du\s+|des\s+)(.*)$/i);
        if (deMatch) {
          ingredientName = deMatch[1].trim();
        } else {
          ingredientName = rest;
        }
      }
    } else {
      // Clean leading "de/d'" if any
      ingredientName = rest.replace(/^(?:d['’]|de\s+|du\s+|des\s+)/i, '').trim();
    }
  }

  ingredientName = ingredientName.replace(/^[:\-–—\s]+/, '').trim();

  return {
    id,
    raw: cleaned,
    quantity,
    unit,
    name: ingredientName || cleaned,
  };
}

export function parseMinutesDuration(str: string): number | undefined {
  if (!str) return undefined;

  const trimmed = str.trim();

  // ISO 8601 like PT1H30M or PT45M or P0DT0H25M
  const isoMatch = trimmed.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3])) {
    const days = parseInt(isoMatch[1] || '0', 10);
    const hours = parseInt(isoMatch[2] || '0', 10);
    const minutes = parseInt(isoMatch[3] || '0', 10);
    return days * 24 * 60 + hours * 60 + minutes;
  }

  // Hours + Minutes: e.g. "1h30", "1 h 30 min", "1 heure 15 minutes"
  const bothMatch = trimmed.match(/(\d+)\s*(?:h|heure|heures)\s*(\d+)?\s*(?:m|min|minute|minutes)?/i);
  if (bothMatch) {
    const hours = parseInt(bothMatch[1], 10);
    const minutes = bothMatch[2] ? parseInt(bothMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }

  // Minutes only: e.g. "45 min", "20 minutes", "15m"
  const minMatch = trimmed.match(/(\d+)\s*(?:m|min|minute|minutes)\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  const numberOnly = parseInt(trimmed, 10);
  if (!isNaN(numberOnly) && numberOnly > 0) return numberOnly;

  return undefined;
}
