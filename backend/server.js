import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = join(__dirname, 'data')
const DB_PATH   = join(DATA_DIR, 'recipes.json')
const PORT      = parseInt(process.env.PORT || '3001')
const HOST      = process.env.HOST || '127.0.0.1'
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN === '*'
    ? '*'
    : process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

// ─── Ensure data dir & file exist ────────────────────────────────────────────
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(DB_PATH))  writeFileSync(DB_PATH, '[]', 'utf8')

function loadDB() {
  try { return JSON.parse(readFileSync(DB_PATH, 'utf8')) }
  catch { return [] }
}
function saveDB(recipes) {
  writeFileSync(DB_PATH, JSON.stringify(recipes, null, 2), 'utf8')
}

// ─── HTML entity decoder ──────────────────────────────────────────────────────
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/&amp;/gi,  '&')
    .replace(/&lt;/gi,   '<')
    .replace(/&gt;/gi,   '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    // Hex entities: &#xHH;
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // Decimal entities: &#NNN;
    .replace(/&#(\d+);/g,           (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Recipe schema.org parser (server-side, no CORS) ─────────────────────────
function parseDuration(iso) {
  if (!iso) return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return iso
  const h = parseInt(m[1] || '0'), min = parseInt(m[2] || '0')
  return [h && `${h}h`, min && `${min}min`].filter(Boolean).join(' ') || ''
}
function extractImage(img) {
  if (!img) return ''
  if (typeof img === 'string') return img
  if (Array.isArray(img)) return extractImage(img[0])
  return img.url || ''
}
function normalizeDots(str) {
  // Replace decimal dots with commas in numbers (French style): "2.5" → "2,5"
  return str.replace(/(\d)\.(\d)/g, '$1,$2')
}
function parseIngredientString(str) {
  if (!str || typeof str !== 'string') return { qty: '', unit: '', name: str || '' }
  str = normalizeDots(str.trim())
  const numRe = /^(\d+\/\d+|\d+(?:[,.]\d+)?(?:\s+(?:\d+\/\d+|[½⅓¼¾⅔⅛⅜⅝⅞]))?|[½⅓¼¾⅔⅛⅜⅝⅞])/
  const numMatch = str.match(numRe)
  if (!numMatch) return { qty: '', unit: '', name: str }
  const numStr = numMatch[1].trim()
  let rest = str.slice(numMatch[0].length).trimStart()
  const unitRe = /^(cuill[eè]r[eé]e?s?\s+[àa]\s+soupe|cuill[eè]r[eé]e?s?\s+[àa]\s+caf[eé]|c\.\s*[àa]\s*[sc]\.|kilogrammes?|grammes?|millilitres?|centilitres?|d[eé]cilitres?|litres?|tasses?|verres?|pinc[eé]es?|poign[eé]es?|tranches?|bottes?|gousses?|brins?|feuilles?|sachets?|bo[îi]tes?|unit[eé]s?|noix|kg|ml|cl|dl|g|L|l)(?=[\s,.)/(]|$)/i
  const unitMatch = rest.match(unitRe)
  const unitStr = unitMatch ? unitMatch[1].trim() : ''
  if (unitMatch) rest = rest.slice(unitMatch[0].length).trimStart()
  const connMatch = rest.match(/^(d[''\u2019]\s*|de\s+|du\s+|des\s+)/i)
  if (connMatch) rest = rest.slice(connMatch[0].length).trimStart()
  const name = rest.trim()
  return { qty: numStr, unit: unitStr, name: name || str }
}
function ingToObj(i) {
  const raw = normalizeDots(decodeEntities(typeof i === 'string' ? i : (i.name || '')))
  return parseIngredientString(raw)
}
function stepToStr(s) {
  if (typeof s === 'string') return decodeEntities(s)
  if (s['@type'] === 'HowToSection') {
    const name = s.name ? decodeEntities(s.name) + ' :\n' : ''
    return name + (s.itemListElement || []).map(stepToStr).join('\n')
  }
  return decodeEntities(s.text || s.name || '')
}
function findRecipeSchema(data) {
  if (!data) return null
  if (Array.isArray(data)) { for (const d of data) { const r = findRecipeSchema(d); if (r) return r } return null }
  if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) return data
  if (data['@graph']) return findRecipeSchema(data['@graph'])
  return null
}
function extractRecipe(schema, url) {
  const ingredients = (schema.recipeIngredient || []).map(ingToObj).filter(i => i.name || i.qty)
  const rawSteps = schema.recipeInstructions || []
  const steps = typeof rawSteps === 'string'
    ? rawSteps.split('\n').map(s => decodeEntities(s)).filter(Boolean)
    : rawSteps.map(stepToStr).filter(Boolean)
  const servings = schema.recipeYield
    ? decodeEntities((Array.isArray(schema.recipeYield) ? schema.recipeYield[0] : schema.recipeYield).toString())
    : ''
  const rawTags = Array.isArray(schema.keywords) ? schema.keywords : (schema.keywords ? schema.keywords.split(',') : [])
  const tags = rawTags.map(k => decodeEntities(k.trim())).filter(Boolean)
  return {
    title: decodeEntities(schema.name || ''),
    description: decodeEntities(schema.description || ''),
    image: extractImage(schema.image),
    prepTime: parseDuration(schema.prepTime),
    cookTime: parseDuration(schema.cookTime),
    totalTime: parseDuration(schema.totalTime),
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

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json({ limit: '10mb' }))

// ── Recipes CRUD ──────────────────────────────────────────────────────────────
app.get('/api/recipes', (_req, res) => {
  res.json(loadDB())
})

app.post('/api/recipes', (req, res) => {
  const db = loadDB()
  const recipe = { ...req.body, id: randomUUID(), createdAt: new Date().toISOString() }
  db.unshift(recipe)
  saveDB(db)
  res.status(201).json(recipe)
})

app.put('/api/recipes/:id', (req, res) => {
  const db = loadDB()
  const idx = db.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const updated = { ...db[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
  db[idx] = updated
  saveDB(db)
  res.json(updated)
})

app.delete('/api/recipes/:id', (req, res) => {
  const db = loadDB()
  const filtered = db.filter(r => r.id !== req.params.id)
  if (filtered.length === db.length) return res.status(404).json({ error: 'Not found' })
  saveDB(filtered)
  res.json({ success: true })
})

// ── Batch import (localStorage migration) ─────────────────────────────────────
app.post('/api/recipes/import', (req, res) => {
  const { recipes } = req.body
  if (!Array.isArray(recipes)) return res.status(400).json({ error: 'recipes array required' })
  const db = loadDB()
  const existingIds = new Set(db.map(r => r.id))
  let imported = 0
  for (const r of recipes) {
    if (!existingIds.has(r.id)) { db.push(r); imported++ }
  }
  saveDB(db)
  res.json({ imported })
})

// ── Server-side URL import (no CORS issues!) ──────────────────────────────────
app.post('/api/import-url', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'DNT': '1',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()

    // ── 1. JSON-LD standard (type="application/ld+json") ─────────────────────
    const jsonldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match, recipe = null
    while ((match = jsonldRe.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1])
        const found = findRecipeSchema(data)
        if (found) { recipe = found; break }
      } catch { /* bad JSON, skip */ }
    }

    // ── 2. JSON-LD dans script sans type ou type=text/javascript (Marmiton…) ──
    if (!recipe) {
      // Look for any script tag whose trimmed content starts with { "@context" or { "@type"
      const anyScriptRe = /<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi
      while ((match = anyScriptRe.exec(html)) !== null) {
        const content = match[1].trim()
        if (!content.startsWith('{')) continue
        try {
          const data = JSON.parse(content)
          const found = findRecipeSchema(data)
          if (found) { recipe = found; break }
        } catch { /* not clean JSON, try to extract embedded object */ }
      }
    }

    // ── 3. Marmiton custom: Mrtn.recipesData = {...} ──────────────────────────
    if (!recipe) {
      const mrtnMatch = html.match(/Mrtn\.recipesData\s*=\s*(\{[\s\S]*?\});\s*(?:var|Mrtn|\n|<\/script>)/)
        || html.match(/Mrtn\.recipesData\s*=\s*(\{[\s\S]{50,5000}?\});/)
      if (mrtnMatch) {
        try {
          const mrtnData = JSON.parse(mrtnMatch[1])
          const recipes = mrtnData.recipes || []
          if (recipes.length > 0) {
            const r = recipes[0]
            // Build {qty, unit, name} objects from Mrtn format {qty, unit, name}
            const ingredients = (r.ingredients || []).map(i => ({
              qty:  i.qty ? normalizeDots(String(i.qty)) : '',
              unit: i.unit ? decodeEntities(i.unit) : '',
              name: decodeEntities(i.name || ''),
            })).filter(i => i.name || i.qty)
            // Steps might be under r.steps or r.instructions
            const steps = (r.steps || r.instructions || []).map(s =>
              decodeEntities(typeof s === 'string' ? s : (s.text || s.description || ''))
            ).filter(Boolean)
            const servings = r.nb_pers
              ? `${r.nb_pers} ${r.servings_unit || 'personnes'}`
              : ''
            return res.json({ ok: true, recipe: {
              title:       decodeEntities(r.name || r.title || ''),
              description: decodeEntities(r.description || ''),
              image:       r.picture_url || r.image_url || '',
              prepTime:    parseDuration(r.prep_time || r.prepTime || ''),
              cookTime:    parseDuration(r.cook_time || r.cookTime || ''),
              totalTime:   parseDuration(r.total_time || r.totalTime || ''),
              servings,
              category:    decodeEntities(r.category || r.category_name || ''),
              cuisine:     decodeEntities(r.cuisine || ''),
              ingredients,
              steps,
              tags:        (r.tags || r.keywords || []).map(t => decodeEntities(typeof t === 'string' ? t : t.name || '')).filter(Boolean),
              sourceUrl:   url,
            }})
          }
        } catch { /* bad Mrtn JSON */ }
      }
    }

    if (recipe) {
      return res.json({ ok: true, recipe: extractRecipe(recipe, url) })
    }

    // ── Fallback 1 : __NEXT_DATA__ (Next.js sites like Marmiton) ─────────────
    const nextMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
    if (nextMatch) {
      try {
        const nextData = JSON.parse(nextMatch[1])
        // Marmiton stores recipe in props.pageProps.recipe or similar
        const pageProps = nextData?.props?.pageProps
        const candidates = [
          pageProps?.recipe,
          pageProps?.data?.recipe,
          pageProps?.recipeDetails,
          pageProps?.initialData?.recipe,
          // Search recursively in pageProps
          ...(pageProps ? Object.values(pageProps).filter(v => v && typeof v === 'object') : []),
        ]
        for (const c of candidates) {
          const found = findRecipeSchema(c)
          if (found) { recipe = found; break }
          // Marmiton might use its own format
          if (c && c.name && c.recipeIngredient) { recipe = c; break }
          if (c && c.title && c.ingredients) {
            // Marmiton custom format
            return res.json({ ok: true, recipe: {
              title: decodeEntities(c.title || c.name || ''),
              description: decodeEntities(c.description || c.summary || ''),
              image: c.image?.url || c.mainImage || c.photo || '',
              prepTime: parseDuration(c.prepTime || c.preparationTime || ''),
              cookTime: parseDuration(c.cookTime || c.cookingTime || ''),
              totalTime: parseDuration(c.totalTime || ''),
              servings: decodeEntities((c.servings || c.yield || c.recipeYield || '').toString()),
              category: decodeEntities(Array.isArray(c.category) ? c.category[0] : c.category || ''),
              cuisine: decodeEntities(c.cuisine || ''),
              ingredients: (c.ingredients || []).map(i => parseIngredientString(normalizeDots(decodeEntities(typeof i === 'string' ? i : (i.name || i.ingredient || i.text || ''))))).filter(i => i.name || i.qty),
              steps: (c.steps || c.instructions || []).map(s => decodeEntities(typeof s === 'string' ? s : (s.text || s.description || s.instruction || ''))).filter(Boolean),
              tags: (c.tags || c.keywords || []).map(t => decodeEntities(typeof t === 'string' ? t : (t.name || t.label || ''))).filter(Boolean),
              sourceUrl: url,
            }})
          }
        }
        if (recipe) {
          return res.json({ ok: true, recipe: extractRecipe(recipe, url) })
        }
      } catch { /* bad __NEXT_DATA__ JSON */ }
    }

    // ── Fallback 2 : window.__INITIAL_STATE__ or similar SPA patterns ─────────
    const initStateMatch = html.match(/window\.__(?:INITIAL_STATE|PRELOADED_STATE|APP_STATE)__\s*=\s*({[\s\S]*?})(?:;|\s*<\/script>)/i)
    if (initStateMatch) {
      try {
        const stateData = JSON.parse(initStateMatch[1])
        const found = findRecipeSchema(stateData)
        if (found) {
          return res.json({ ok: true, recipe: extractRecipe(found, url) })
        }
      } catch { /* bad JSON */ }
    }

    // ── Fallback 4 : Open Graph meta tags (decode entities in attribute values too)
    const title       = decodeEntities(
                          html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
                       || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
                       || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
                       || '')
    const description = decodeEntities(
                          html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1]
                       || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
                       || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
                       || '')
    const image       = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
                     || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
                     || ''

    if (!title) {
      return res.status(422).json({ error: "Aucune recette trouvée sur cette page. Le site n'utilise pas le format standard (schema.org/Recipe)." })
    }

    res.json({ ok: true, recipe: { title, description, image, prepTime: '', cookTime: '', totalTime: '', servings: '', category: '', cuisine: '', ingredients: [], steps: [], tags: [], sourceUrl: url } })

  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? 'Le site a mis trop de temps à répondre (>15s).'
      : `Impossible de récupérer la page : ${err.message}`
    res.status(502).json({ error: msg })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`✅ Backend Mes Recettes → http://${HOST}:${PORT}`)
  console.log(`   Base de données      → ${DB_PATH}`)
})
