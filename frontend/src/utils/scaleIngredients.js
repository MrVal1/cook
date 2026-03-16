/**
 * Ingredient utilities — format {qty: string, unit: string, name: string}
 *
 * qty  = numeric quantity only  e.g. "400"  "1/2"  "½"  "3"  ""
 * unit = unit of measure        e.g. "g"  "cl"  "c. à s."  ""
 * name = ingredient name        e.g. "gruyère"  "sel"  "oeufs"
 */

// ─── Vulgar fraction symbols ──────────────────────────────────────────────────
const NICE_FRACTIONS = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'],
]
const EPSILON = 0.07

/** Format a number as a human-friendly French string (comma for decimal). */
export function formatNumber(n) {
  if (n <= 0) return '0'
  const rounded = Math.round(n)
  if (Math.abs(n - rounded) < EPSILON) return String(rounded)
  const whole = Math.floor(n)
  const frac = n - whole
  for (const [val, sym] of NICE_FRACTIONS) {
    if (Math.abs(frac - val) < EPSILON) return whole > 0 ? `${whole} ${sym}` : sym
  }
  return n.toFixed(1).replace('.', ',')
}

function parseLeadingNumber(str) {
  // Mixed: "1 1/2" or "1 ½"
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)/)
  if (mixed) return { value: parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]), end: mixed[0].length }
  const mixedVulgar = str.match(/^(\d+)\s+([½⅓¼¾⅔⅛⅜⅝⅞])/)
  if (mixedVulgar) {
    const VALS = { '½': 0.5, '⅓': 1/3, '¼': 0.25, '¾': 0.75, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
    return { value: parseInt(mixedVulgar[1]) + (VALS[mixedVulgar[2]] || 0), end: mixedVulgar[0].length }
  }
  // Vulgar fraction alone
  const vulgar = str.match(/^([½⅓¼¾⅔⅛⅜⅝⅞])/)
  if (vulgar) {
    const VALS = { '½': 0.5, '⅓': 1/3, '¼': 0.25, '¾': 0.75, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }
    return { value: VALS[vulgar[1]] || 0, end: 1 }
  }
  // Simple fraction
  const frac = str.match(/^(\d+)\/(\d+)/)
  if (frac) return { value: parseInt(frac[1]) / parseInt(frac[2]), end: frac[0].length }
  // Decimal (comma or dot)
  const dec = str.match(/^(\d+)[,.](\d+)/)
  if (dec) return { value: parseFloat(dec[0].replace(',', '.')), end: dec[0].length }
  // Integer
  const int = str.match(/^(\d+)/)
  if (int) return { value: parseInt(int[1]), end: int[0].length }
  return null
}

function normalizeDots(str) {
  return str.replace(/(\d)\.(\d)/g, '$1,$2')
}

// ─── Unit normalizer ──────────────────────────────────────────────────────────
/**
 * Maps any unit variant to a canonical value used by the <select> in RecipeForm.
 * Returns the unit as-is if it doesn't match any known variant.
 *
 * Canonical select values: g, kg, ml, cl, dl, L,
 *   c. à s., c. à c., verre, tasse,
 *   pincée, poignée, tranche, botte, gousse, brin, feuille, sachet, boîte, noix
 */
export function normalizeUnit(unit) {
  if (!unit) return ''
  const u = unit.trim()
  // Tablespoon variants
  if (/cuill[eè]r[eé]e?s?\s+[àa]\s+soupe/i.test(u)) return 'c. à s.'
  if (/^c\.\s*[àa]\s*s\.$/i.test(u)) return 'c. à s.'
  // Teaspoon variants
  if (/cuill[eè]r[eé]e?s?\s+[àa]\s+caf[eé]/i.test(u)) return 'c. à c.'
  if (/^c\.\s*[àa]\s*c\.$/i.test(u)) return 'c. à c.'
  // Weight
  if (/^kilogrammes?$/i.test(u)) return 'kg'
  if (/^kg$/i.test(u)) return 'kg'
  if (/^grammes?$/i.test(u)) return 'g'
  if (/^g$/i.test(u)) return 'g'
  // Volume
  if (/^millilitres?$/i.test(u)) return 'ml'
  if (/^ml$/i.test(u)) return 'ml'
  if (/^centilitres?$/i.test(u)) return 'cl'
  if (/^cl$/i.test(u)) return 'cl'
  if (/^d[eé]cilitres?$/i.test(u)) return 'dl'
  if (/^dl$/i.test(u)) return 'dl'
  if (/^litres?$/i.test(u)) return 'L'
  if (/^[lL]$/.test(u)) return 'L'
  // Kitchen measures
  if (/^tasses?$/i.test(u)) return 'tasse'
  if (/^verres?$/i.test(u)) return 'verre'
  // Other units
  if (/^pinc[eé]es?$/i.test(u)) return 'pincée'
  if (/^poign[eé]es?$/i.test(u)) return 'poignée'
  if (/^tranches?$/i.test(u)) return 'tranche'
  if (/^bottes?$/i.test(u)) return 'botte'
  if (/^gousses?$/i.test(u)) return 'gousse'
  if (/^brins?$/i.test(u)) return 'brin'
  if (/^feuilles?$/i.test(u)) return 'feuille'
  if (/^sachets?$/i.test(u)) return 'sachet'
  if (/^bo[îi]tes?$/i.test(u)) return 'boîte'
  if (/^noix$/i.test(u)) return 'noix'
  return u // keep as-is if not recognized
}

// ─── Ingredient string parser ─────────────────────────────────────────────────
/**
 * Parse a full ingredient string into {qty, unit, name}.
 * "400 g de gruyère"            → { qty: "400",  unit: "g",         name: "gruyère" }
 * "2 cuillères à soupe d'huile" → { qty: "2",    unit: "c. à s.",   name: "huile" }
 * "1/2 cuillerée à café de sel" → { qty: "1/2",  unit: "c. à c.",   name: "sel" }
 * "12 échalotes"                → { qty: "12",   unit: "",           name: "échalotes" }
 * "sel"                         → { qty: "",     unit: "",           name: "sel" }
 */
export function parseIngredientString(str) {
  if (!str || typeof str !== 'string') return { qty: '', unit: '', name: str || '' }
  str = normalizeDots(str.trim())

  // Step 1: extract leading number (fractions before plain integers to avoid "1" matching "1/2")
  const numRe = /^(\d+\/\d+|\d+(?:[,.]\d+)?(?:\s+(?:\d+\/\d+|[½⅓¼¾⅔⅛⅜⅝⅞]))?|[½⅓¼¾⅔⅛⅜⅝⅞])/
  const numMatch = str.match(numRe)
  if (!numMatch) return { qty: '', unit: '', name: str }

  const numStr = numMatch[1].trim()
  let rest = str.slice(numMatch[0].length).trimStart()

  // Step 2: extract unit (longest match first), then normalize to canonical form
  const unitRe = /^(cuill[eè]r[eé]e?s?\s+[àa]\s+soupe|cuill[eè]r[eé]e?s?\s+[àa]\s+caf[eé]|c\.\s*[àa]\s*[sc]\.|kilogrammes?|grammes?|millilitres?|centilitres?|d[eé]cilitres?|litres?|tasses?|verres?|pinc[eé]es?|poign[eé]es?|tranches?|bottes?|gousses?|brins?|feuilles?|sachets?|bo[îi]tes?|unit[eé]s?|noix|kg|ml|cl|dl|g|L|l)(?=[\s,.)/(]|$)/i
  const unitMatch = rest.match(unitRe)
  const unitStr = unitMatch ? normalizeUnit(unitMatch[1].trim()) : ''
  if (unitMatch) rest = rest.slice(unitMatch[0].length).trimStart()

  // Step 3: strip "de / d' / du / des" connector
  const connMatch = rest.match(/^(d[''\u2019]\s*|de\s+|du\s+|des\s+)/i)
  if (connMatch) rest = rest.slice(connMatch[0].length).trimStart()

  const name = rest.trim()
  return { qty: numStr, unit: unitStr, name: name || str }
}

/** Normalize any ingredient format to the canonical {qty, unit, name} object. */
export function normalizeIngObj(ing) {
  if (!ing) return { qty: '', unit: '', name: '' }
  if (typeof ing === 'string') return parseIngredientString(ing)
  // Already has the unit key → new 3-field format
  if ('unit' in ing) return { qty: ing.qty || '', unit: normalizeUnit(ing.unit || ''), name: ing.name || '' }
  // Old 2-field {qty, name}: qty contains "400 g" — re-parse the combined string
  const combined = [ing.qty, ing.name].filter(Boolean).join(' ')
  return parseIngredientString(combined)
}

/** Convert any ingredient format to a plain display string. */
export function ingToString(ing) {
  if (!ing) return ''
  if (typeof ing === 'string') return ing
  const { qty, unit, name } = normalizeIngObj(ing)
  return [qty, unit, name].filter(Boolean).join(' ')
}

// ─── Scaling ──────────────────────────────────────────────────────────────────
/**
 * Scale an ingredient quantity by factor.
 * Accepts {qty, unit, name}, legacy {qty, name}, or a plain string.
 * Always returns {qty, unit, name}.
 */
export function scaleIngredient(ing, factor) {
  if (!ing) return { qty: '', unit: '', name: '' }

  const { qty, unit, name } = normalizeIngObj(ing)

  if (!qty) return { qty: '', unit, name }

  const parsed = parseLeadingNumber(qty)
  if (!parsed) return { qty: normalizeDots(qty), unit, name }

  const scaledVal = parsed.value * factor
  return { qty: formatNumber(scaledVal), unit, name }
}

/** Parse a servings count from "4 personnes", "pour 6", "8". */
export function parseServings(str) {
  if (!str) return null
  const match = String(str).match(/\d+/)
  return match ? parseInt(match[0]) : null
}
