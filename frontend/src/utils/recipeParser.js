/**
 * Import a recipe from a URL.
 * First tries the backend (/api/import-url) which does the fetch server-side
 * (no CORS issues, better User-Agent, real browser headers).
 * Falls back to a public CORS proxy if the backend is unreachable.
 */
import { parseIngredientString } from './scaleIngredients'

// ─── HTML entity decoder (client-side mirror of the server version) ───────────
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/&amp;/gi,  '&')
    .replace(/&lt;/gi,   '<')
    .replace(/&gt;/gi,   '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g,           (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function parseDuration(iso) {
  if (!iso) return ''
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return iso
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  return [h && `${h}h`, m && `${m}min`].filter(Boolean).join(' ') || ''
}
function extractImage(image) {
  if (!image) return ''
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return extractImage(image[0])
  return image.url || ''
}
function normalizeDots(str) {
  return str.replace(/(\d)\.(\d)/g, '$1,$2')
}
function ingredientToObject(ing) {
  const raw = normalizeDots(decodeEntities(typeof ing === 'string' ? ing : (ing.name || '')))
  return parseIngredientString(raw)
}
function stepToString(step) {
  if (typeof step === 'string') return decodeEntities(step)
  if (step['@type'] === 'HowToSection') {
    const name = step.name ? decodeEntities(step.name) + ' :\n' : ''
    return name + (step.itemListElement || []).map(stepToString).join('\n')
  }
  return decodeEntities(step.text || step.name || '')
}
function findRecipeSchema(data) {
  if (!data) return null
  if (Array.isArray(data)) { for (const d of data) { const r = findRecipeSchema(d); if (r) return r } return null }
  if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) return data
  if (data['@graph']) return findRecipeSchema(data['@graph'])
  return null
}
function extractFromSchema(schema, url) {
  const ingredients = (schema.recipeIngredient || []).map(ingredientToObject).filter(i => i.name || i.qty)
  const rawInstructions = schema.recipeInstructions || []
  const steps = typeof rawInstructions === 'string'
    ? rawInstructions.split('\n').map(s => decodeEntities(s)).filter(Boolean)
    : rawInstructions.map(stepToString).filter(Boolean)
  const servings = schema.recipeYield
    ? decodeEntities((Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield).toString())
    : ''
  const rawTags = Array.isArray(schema.keywords) ? schema.keywords : (schema.keywords ? schema.keywords.split(',') : [])
  const tags = rawTags.map(k => decodeEntities(k.trim())).filter(Boolean)
  return {
    title:       decodeEntities(schema.name || ''),
    description: decodeEntities(schema.description || ''),
    image:       extractImage(schema.image),
    prepTime:    parseDuration(schema.prepTime),
    cookTime:    parseDuration(schema.cookTime),
    totalTime:   parseDuration(schema.totalTime),
    servings,
    category: decodeEntities(Array.isArray(schema.recipeCategory) ? schema.recipeCategory[0] : schema.recipeCategory || ''),
    cuisine:  decodeEntities(Array.isArray(schema.recipeCuisine)  ? schema.recipeCuisine[0]  : schema.recipeCuisine  || ''),
    ingredients,
    steps,
    tags,
    sourceUrl: url,
    rating: schema.aggregateRating?.ratingValue || '',
  }
}

// ─── Client-side fallback via CORS proxy ─────────────────────────────────────
async function importViaProxy(url) {
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]

  let html = null
  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) continue
      const json = await res.json()
      html = json.contents ?? json
      if (html) break
    } catch { /* try next proxy */ }
  }

  if (!html) throw new Error("Tous les proxies ont échoué. Réessayez plus tard.")

  const parser = new DOMParser()
  const doc = parser.parseFromString(typeof html === 'string' ? html : JSON.stringify(html), 'text/html')

  // 1. JSON-LD standard
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const found = findRecipeSchema(JSON.parse(script.textContent))
      if (found) return extractFromSchema(found, url)
    } catch { /* bad JSON */ }
  }
  // 2. JSON-LD in plain <script> tags (Marmiton et al.)
  for (const script of doc.querySelectorAll('script:not([src])')) {
    const content = script.textContent.trim()
    if (!content.startsWith('{')) continue
    try {
      const found = findRecipeSchema(JSON.parse(content))
      if (found) return extractFromSchema(found, url)
    } catch { /* not clean JSON */ }
  }

  // Open Graph fallback — DOMParser already decodes attribute entities natively
  const title = doc.querySelector('meta[property="og:title"]')?.content || doc.title || ''
  if (!title) throw new Error("Aucune recette trouvée sur cette page.")
  return {
    title:       decodeEntities(title),
    description: decodeEntities(doc.querySelector('meta[property="og:description"]')?.content || ''),
    image:       doc.querySelector('meta[property="og:image"]')?.content || '',
    prepTime: '', cookTime: '', totalTime: '', servings: '',
    category: '', cuisine: '', ingredients: [], steps: [], tags: [],
    sourceUrl: url,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function importRecipeFromUrl(url) {
  // 1. Try backend (server-side fetch — no CORS, best reliability)
  try {
    const res = await fetch('/api/import-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
    return data.recipe
  } catch (backendErr) {
    // If the backend itself is unreachable (ECONNREFUSED etc.), fall back to proxy
    if (backendErr.message.includes('fetch') || backendErr.name === 'TypeError') {
      console.warn('Backend injoignable, tentative via proxy client…')
      return importViaProxy(url)
    }
    // Otherwise it's a real error from the backend (site inaccessible, no recipe, etc.)
    throw backendErr
  }
}
